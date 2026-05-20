use tauri::State;

use crate::core::error::AppResult;
use crate::core::profile::{GitIdentity, Profile, SshConfig};
use crate::core::scan::{self, EnvScanReport, ProfileDraft};
use crate::AppState;

#[tauri::command]
pub fn is_first_run(state: State<'_, AppState>) -> AppResult<bool> {
    let store = state.store.lock().unwrap();
    Ok(!store.flags.first_run_completed && store.data.profiles.is_empty())
}

#[tauri::command]
pub fn scan_local_git_environment() -> AppResult<EnvScanReport> {
    scan::scan()
}

#[tauri::command]
pub fn import_as_profile(
    state: State<'_, AppState>,
    report: EnvScanReport,
    selections: Vec<ProfileDraft>,
) -> AppResult<Vec<Profile>> {
    let mut store = state.store.lock().unwrap();
    let mut created: Vec<Profile> = vec![];
    let mut active_id: Option<String> = None;

    for draft in selections {
        let merged = merge_identity(&draft.git, &report);
        let mut p = Profile::new(draft.name, merged);
        if let Some(path) = draft.ssh_key_path {
            if !path.is_empty() {
                p.ssh = Some(SshConfig {
                    key_path: path,
                    ..Default::default()
                });
            }
        }
        if draft.make_active {
            active_id = Some(p.id.clone());
        }
        created.push(p.clone());
        store.data.profiles.push(p);
    }

    if let Some(id) = active_id {
        store.data.active_profile_id = Some(id);
    }

    store.flags.first_run_completed = true;
    store.flags.first_run_completed_at = Some(chrono::Utc::now());
    store.save()?;
    Ok(created)
}

#[tauri::command]
pub fn mark_first_run_completed(state: State<'_, AppState>) -> AppResult<()> {
    let mut store = state.store.lock().unwrap();
    store.flags.first_run_completed = true;
    store.flags.first_run_completed_at = Some(chrono::Utc::now());
    store.save()?;
    Ok(())
}

fn merge_identity(input: &GitIdentity, report: &EnvScanReport) -> GitIdentity {
    let mut out = input.clone();
    let g = &report.global_git_config;
    if out.user_name.is_empty() {
        out.user_name = g.user_name.clone().unwrap_or_default();
    }
    if out.user_email.is_empty() {
        out.user_email = g.user_email.clone().unwrap_or_default();
    }
    if out.signing_key.is_none() {
        out.signing_key = g.signing_key.clone();
    }
    if out.gpg_sign.is_none() {
        out.gpg_sign = g.gpg_sign;
    }
    if out.default_branch.is_none() {
        out.default_branch = g.default_branch.clone();
    }
    out
}
