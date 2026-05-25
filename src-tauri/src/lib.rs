mod commands;
mod core;

use std::sync::Mutex;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
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
    let show = MenuItemBuilder::with_id("show", "显示窗口").build(manager)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(manager)?;
    let menu = MenuBuilder::new(manager).items(&[&show, &quit]).build()?;

    TrayIconBuilder::with_id("main")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                let _ = crate::commands::system::show_main_window(app.clone());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = crate::commands::system::show_main_window(tray.app_handle().clone());
            }
        })
        .build(manager)?;
    Ok(())
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
