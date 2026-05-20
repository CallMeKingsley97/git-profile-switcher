mod commands;
mod core;

use std::sync::Mutex;
use tauri::Manager;

use crate::core::store::Store;

pub struct AppState {
    pub store: Mutex<Store>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .expect("failed to resolve app_config_dir");
            std::fs::create_dir_all(&config_dir).ok();

            let store = Store::load_or_init(&config_dir)?;
            app.manage(AppState {
                store: Mutex::new(store),
            });
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
