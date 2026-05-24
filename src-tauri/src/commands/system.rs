use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_notification::NotificationExt;

use crate::core::error::AppResult;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemIntegrationStatus {
    pub autostart_enabled: bool,
}

#[tauri::command]
pub fn get_system_integration_status(app: AppHandle) -> AppResult<SystemIntegrationStatus> {
    let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);
    Ok(SystemIntegrationStatus { autostart_enabled })
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> AppResult<SystemIntegrationStatus> {
    if enabled {
        app.autolaunch()
            .enable()
            .map_err(|e| crate::core::error::AppError::Other(e.to_string()))?;
    } else {
        app.autolaunch()
            .disable()
            .map_err(|e| crate::core::error::AppError::Other(e.to_string()))?;
    }
    get_system_integration_status(app)
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
    let _ = app
        .notification()
        .builder()
        .title("Git Profile Switcher")
        .body(format!("已切换到 {profile_name}"))
        .show();
}
