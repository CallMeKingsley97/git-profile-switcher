use tauri::State;

use crate::core::error::AppResult;
use crate::core::profile::SwitchRecord;
use crate::AppState;

#[tauri::command]
pub fn list_history(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> AppResult<Vec<SwitchRecord>> {
    let store = state.store.lock().unwrap();
    let n = limit.unwrap_or(50).min(store.history.len());
    Ok(store.history.iter().take(n).cloned().collect())
}
