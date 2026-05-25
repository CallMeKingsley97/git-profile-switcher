mod commands;
mod core;

use std::sync::Mutex;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, Resource};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

use crate::core::store::Store;

pub struct AppState {
    pub store: Mutex<Store>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .expect("failed to resolve app_config_dir");
            std::fs::create_dir_all(&config_dir).ok();

            let store = Store::load_or_init(&config_dir)?;
            let tray_enabled = store.flags.tray_enabled;
            let global_shortcut_enabled = store.flags.global_shortcut_enabled;
            app.manage(AppState {
                store: Mutex::new(store),
            });
            if tray_enabled {
                setup_tray(app.handle())?;
            }
            if global_shortcut_enabled {
                setup_global_shortcut(app.handle())?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::profile::list_profiles,
            commands::profile::get_profile,
            commands::profile::create_profile,
            commands::profile::update_profile,
            commands::profile::delete_profile,
            commands::profile::duplicate_profile,
            commands::profile::get_active_profile,
            commands::switch::switch_profile,
            commands::switch::get_current_git_config,
            commands::scan::scan_local_git_environment,
            commands::scan::import_as_profile,
            commands::scan::mark_first_run_completed,
            commands::scan::is_first_run,
            commands::backup::list_backups,
            commands::backup::restore_backup,
            commands::history::list_history,
            commands::ssh::list_ssh_keys,
            commands::ssh::generate_ssh_key,
            commands::ssh::read_ssh_public_key,
            commands::ssh::test_ssh_connection,
            commands::system::get_system_integration_status,
            commands::system::set_autostart,
            commands::system::set_global_shortcut,
            commands::system::set_tray,
            commands::system::set_notifications,
            commands::system::show_main_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn sync_tray(app: &AppHandle, enabled: bool) -> tauri::Result<()> {
    if enabled {
        if app.tray_by_id("main").is_none() {
            setup_tray(app)?;
        }
    } else if let Some(tray) = app.tray_by_id("main") {
        Resource::close(tray.into());
    }
    Ok(())
}

fn setup_tray(manager: &AppHandle) -> tauri::Result<()> {
    let switch_menu = build_switch_profile_menu(manager)?;
    let show = MenuItemBuilder::with_id("show", "显示窗口").build(manager)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(manager)?;
    let separator = PredefinedMenuItem::separator(manager)?;
    let menu = MenuBuilder::new(manager)
        .items(&[&switch_menu, &separator, &show, &quit])
        .build()?;

    TrayIconBuilder::with_id("main")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                let _ = crate::commands::system::show_main_window(app.clone());
            }
            "quit" => app.exit(0),
            id if id.starts_with("switch-profile:") => {
                let profile_id = id.trim_start_matches("switch-profile:");
                if let Err(err) = switch_profile_from_tray(app, profile_id) {
                    eprintln!("failed to switch profile from tray: {err}");
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|_tray, _event| {})
        .build(manager)?;
    Ok(())
}

fn build_switch_profile_menu(
    manager: &AppHandle,
) -> tauri::Result<tauri::menu::Submenu<tauri::Wry>> {
    let profiles = manager
        .state::<AppState>()
        .store
        .lock()
        .unwrap()
        .data
        .profiles
        .clone();
    let mut builder = SubmenuBuilder::new(manager, "快速切换 Profile");

    if profiles.is_empty() {
        builder = builder.item(
            &MenuItemBuilder::with_id("switch-profile-empty", "暂无 Profile")
                .enabled(false)
                .build(manager)?,
        );
    } else {
        for profile in profiles {
            let ssh_label = profile
                .ssh
                .as_ref()
                .filter(|ssh| !ssh.key_path.trim().is_empty())
                .map(|_| " · SSH")
                .unwrap_or_default();
            let label = format!("{} <{}>{}", profile.name, profile.git.user_email, ssh_label);
            let item = MenuItemBuilder::with_id(format!("switch-profile:{}", profile.id), label)
                .build(manager)?;
            builder = builder.item(&item);
        }
    }

    builder.build()
}

pub fn refresh_tray_menu(app: &AppHandle) -> tauri::Result<()> {
    if let Some(tray) = app.tray_by_id("main") {
        let switch_menu = build_switch_profile_menu(app)?;
        let show = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
        let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;
        let separator = PredefinedMenuItem::separator(app)?;
        let menu = MenuBuilder::new(app)
            .items(&[&switch_menu, &separator, &show, &quit])
            .build()?;
        tray.set_menu(Some(menu))?;
    }
    Ok(())
}

fn switch_profile_from_tray(app: &AppHandle, id: &str) -> crate::core::error::AppResult<()> {
    let backups_dir;
    let profile;
    {
        let state = app.state::<AppState>();
        let store = state.store.lock().unwrap();
        profile = store
            .find(id)
            .cloned()
            .ok_or_else(|| crate::core::error::AppError::NotFound(format!("profile {id}")))?;
        backups_dir = store.backups_dir();
    }

    let scope = crate::core::switcher::SwitchScope::Global;
    let apply_result = crate::core::switcher::apply_profile(&profile, scope.clone(), &backups_dir);
    let state = app.state::<AppState>();
    let mut store = state.store.lock().unwrap();
    match apply_result {
        Ok(_) => {
            store.data.active_profile_id = Some(id.to_string());
            if let Some(p) = store.find_mut(id) {
                p.last_used_at = Some(chrono::Utc::now());
            }
            let record = crate::core::switcher::make_record(&profile, &scope, true, None);
            store.push_history(record, crate::commands::switch::MAX_HISTORY);
            let _ = crate::core::backup::prune(
                &store.backups_dir(),
                crate::commands::switch::MAX_BACKUPS,
            );
            store.save()?;
            crate::commands::system::notify_switch_success(app, &profile.name);
            drop(store);
            let _ = refresh_tray_menu(app);
            Ok(())
        }
        Err(e) => {
            let record =
                crate::core::switcher::make_record(&profile, &scope, false, Some(e.to_string()));
            store.push_history(record, crate::commands::switch::MAX_HISTORY);
            store.save()?;
            Err(e)
        }
    }
}

pub fn sync_global_shortcut(app: &AppHandle, enabled: bool) -> tauri::Result<()> {
    let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyG);
    if enabled {
        app.global_shortcut()
            .register(shortcut)
            .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e.to_string())))?;
    } else {
        app.global_shortcut()
            .unregister(shortcut)
            .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e.to_string())))?;
    }
    Ok(())
}

fn setup_global_shortcut(app: &AppHandle) -> tauri::Result<()> {
    let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyG);
    app.global_shortcut()
        .on_shortcut(shortcut, |app, _shortcut, event| {
            if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                let _ = crate::commands::system::show_main_window(app.clone());
            }
        })
        .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e.to_string())))?;
    sync_global_shortcut(app, true)?;
    Ok(())
}
