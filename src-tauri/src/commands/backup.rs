use tauri::State;

use crate::core::backup::{self, BackupEntry};
use crate::core::error::AppResult;
use crate::AppState;

#[tauri::command]
pub fn list_backups(state: State<'_, AppState>) -> AppResult<Vec<BackupEntry>> {
    let store = state.store.lock().unwrap();
    backup::list_backups(&store.backups_dir())
}

#[tauri::command]
pub fn restore_backup(state: State<'_, AppState>, backup_id: String) -> AppResult<()> {
    let store = state.store.lock().unwrap();
    backup::restore_backup(&store.backups_dir(), &backup_id)
}
