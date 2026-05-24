use tauri::{AppHandle, Manager, State};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_notification::NotificationExt;

use crate::core::error::AppResult;
use crate::AppState;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemIntegrationStatus {
    pub autostart_enabled: bool,
    pub global_shortcut_enabled: bool,
    pub tray_enabled: bool,
    pub notifications_enabled: bool,
}

#[tauri::command]
pub fn get_system_integration_status(
    app: AppHandle,
    state: State<'_, AppState>,
) -> AppResult<SystemIntegrationStatus> {
    let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);
    let store = state.store.lock().unwrap();
    Ok(SystemIntegrationStatus {
        autostart_enabled,
        global_shortcut_enabled: store.flags.global_shortcut_enabled,
        tray_enabled: store.flags.tray_enabled,
        notifications_enabled: store.flags.notifications_enabled,
    })
}

#[tauri::command]
pub fn set_autostart(
    app: AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> AppResult<SystemIntegrationStatus> {
    if enabled {
        app.autolaunch()
            .enable()
            .map_err(|e| crate::core::error::AppError::Other(e.to_string()))?;
    } else {
        app.autolaunch()
            .disable()
            .map_err(|e| crate::core::error::AppError::Other(e.to_string()))?;
    }
    get_system_integration_status(app, state)
}

#[tauri::command]
pub fn set_global_shortcut(
    app: AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> AppResult<SystemIntegrationStatus> {
    {
        let mut store = state.store.lock().unwrap();
        store.flags.global_shortcut_enabled = enabled;
        store.save()?;
    }
    crate::sync_global_shortcut(&app, enabled)
        .map_err(|e| crate::core::error::AppError::Other(e.to_string()))?;
    get_system_integration_status(app, state)
}

#[tauri::command]
pub fn set_tray(
    app: AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> AppResult<SystemIntegrationStatus> {
    {
        let mut store = state.store.lock().unwrap();
        store.flags.tray_enabled = enabled;
        store.save()?;
    }
    crate::sync_tray(&app, enabled)
        .map_err(|e| crate::core::error::AppError::Other(e.to_string()))?;
    get_system_integration_status(app, state)
}

#[tauri::command]
pub fn set_notifications(
    app: AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> AppResult<SystemIntegrationStatus> {
    {
        let mut store = state.store.lock().unwrap();
        store.flags.notifications_enabled = enabled;
        store.save()?;
    }
    get_system_integration_status(app, state)
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> AppResult<()> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .show()
            .map_err(|e| crate::core::error::AppError::Other(e.to_string()))?;
        window
            .set_focus()
            .map_err(|e| crate::core::error::AppError::Other(e.to_string()))?;
    }
    Ok(())
}

pub fn notify_switch_success(app: &AppHandle, profile_name: &str) {
    let enabled = app
        .state::<AppState>()
        .store
        .lock()
        .map(|store| store.flags.notifications_enabled)
        .unwrap_or(false);
    if !enabled {
        return;
    }

    let _ = app
        .notification()
        .builder()
        .title("Git Profile Switcher")
        .body(format!("已切换到 {profile_name}"))
        .show();
}
