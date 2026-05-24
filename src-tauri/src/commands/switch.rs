use std::path::PathBuf;

use tauri::State;

use crate::core::error::{AppError, AppResult};
use crate::core::git_config::{self, ConfigScope, GitConfigSnapshot};
use crate::core::switcher::{self, SwitchResult, SwitchScope};
use crate::AppState;

const MAX_HISTORY: usize = 200;
const MAX_BACKUPS: usize = 20;

#[tauri::command]
pub fn switch_profile(
    state: State<'_, AppState>,
    id: String,
    scope: SwitchScope,
) -> AppResult<SwitchResult> {
    let backups_dir;
    let profile;
    {
        let store = state.store.lock().unwrap();
        profile = store
            .find(&id)
            .cloned()
            .ok_or_else(|| AppError::NotFound(format!("profile {id}")))?;
        backups_dir = store.backups_dir();
    }

    let apply_result = switcher::apply_profile(&profile, scope.clone(), &backups_dir);

    let mut store = state.store.lock().unwrap();
    match apply_result {
        Ok(outcome) => {
            if matches!(scope, SwitchScope::Global) {
                store.data.active_profile_id = Some(id.clone());
            }
            if let Some(p) = store.find_mut(&id) {
                p.last_used_at = Some(chrono::Utc::now());
            }
            let record = switcher::make_record(&profile, &scope, true, None);
            store.push_history(record, MAX_HISTORY);
            let _ = crate::core::backup::prune(&store.backups_dir(), MAX_BACKUPS);
            store.save()?;
            Ok(SwitchResult {
                profile_id: id,
                scope: match scope {
                    SwitchScope::Global => "global".into(),
                    SwitchScope::Local { .. } => "local".into(),
                },
                backup_id: outcome.backup_id,
                ssh_backup_id: outcome.ssh_backup_id,
                applied_keys: outcome.applied_keys,
            })
        }
        Err(e) => {
            let record =
                switcher::make_record(&profile, &scope, false, Some(e.to_string()));
            store.push_history(record, MAX_HISTORY);
            store.save()?;
            Err(e)
        }
    }
}

#[tauri::command]
pub fn get_current_git_config(scope: SwitchScope) -> AppResult<GitConfigSnapshot> {
    match scope {
        SwitchScope::Global => git_config::read_snapshot(ConfigScope::Global),
        SwitchScope::Local { path } => {
            let path_buf = PathBuf::from(path);
            git_config::read_snapshot(ConfigScope::Local(&path_buf))
        }
    }
}
