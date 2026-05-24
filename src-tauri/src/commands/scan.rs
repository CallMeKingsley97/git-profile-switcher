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
    let mut affected: Vec<Profile> = vec![];
    let mut active_id: Option<String> = None;

    for draft in selections {
        let merged = merge_identity(&draft.git, &report);
        let ssh_key_path = draft
            .ssh_key_path
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string);

        let existing_idx = store.data.profiles.iter().position(|p| {
            p.git.user_email.eq_ignore_ascii_case(&merged.user_email)
                && profile_ssh_path(p) == ssh_key_path.as_deref()
        });

        let id = if let Some(idx) = existing_idx {
            let p = &mut store.data.profiles[idx];
            fill_missing_fields(p, &merged, ssh_key_path.as_deref());
            p.updated_at = chrono::Utc::now();
            affected.push(p.clone());
            p.id.clone()
        } else {
            let mut p = Profile::new(draft.name, merged);
            if let Some(path) = ssh_key_path {
                p.ssh = Some(SshConfig {
                    key_path: path,
                    ..Default::default()
                });
            }
            let new_id = p.id.clone();
            affected.push(p.clone());
            store.data.profiles.push(p);
            new_id
        };

        if draft.make_active {
            active_id = Some(id);
        }
    }

    if let Some(id) = active_id {
        store.data.active_profile_id = Some(id);
    }

    store.flags.first_run_completed = true;
    store.flags.first_run_completed_at = Some(chrono::Utc::now());
    store.save()?;
    Ok(affected)
}

fn profile_ssh_path(p: &Profile) -> Option<&str> {
    p.ssh
        .as_ref()
        .map(|s| s.key_path.as_str())
        .filter(|s| !s.is_empty())
}

fn fill_missing_fields(p: &mut Profile, src: &GitIdentity, ssh_key_path: Option<&str>) {
    if p.git.user_name.is_empty() && !src.user_name.is_empty() {
        p.git.user_name = src.user_name.clone();
    }
    if p.git.signing_key.is_none() {
        p.git.signing_key = src.signing_key.clone();
    }
    if p.git.gpg_sign.is_none() {
        p.git.gpg_sign = src.gpg_sign;
    }
    if p.git.default_branch.is_none() {
        p.git.default_branch = src.default_branch.clone();
    }
    if let Some(path) = ssh_key_path {
        match &mut p.ssh {
            Some(cfg) if cfg.key_path.is_empty() => cfg.key_path = path.to_string(),
            None => {
                p.ssh = Some(SshConfig {
                    key_path: path.to_string(),
                    ..Default::default()
                });
            }
            _ => {}
        }
    }
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
