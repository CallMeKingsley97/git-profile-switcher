use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::error::AppResult;
use super::git_config::{self, ConfigScope};
use super::profile::{Profile, Scope, SwitchRecord};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase", tag = "type")]
pub enum SwitchScope {
    Global,
    #[serde(rename_all = "camelCase")]
    Local { path: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchResult {
    pub profile_id: String,
    pub scope: String,
    pub backup_id: Option<String>,
    pub applied_keys: Vec<String>,
}

pub struct ApplyOutcome {
    pub backup_id: Option<String>,
    pub applied_keys: Vec<String>,
}

pub fn apply_profile(
    profile: &Profile,
    scope: SwitchScope,
    backups_dir: &Path,
) -> AppResult<ApplyOutcome> {
    let local_path: Option<PathBuf> = match &scope {
        SwitchScope::Global => None,
        SwitchScope::Local { path } => Some(PathBuf::from(path)),
    };
    let cfg_scope = match local_path.as_ref() {
        None => ConfigScope::Global,
        Some(p) => ConfigScope::Local(p.as_path()),
    };

    let backup_id = if matches!(scope, SwitchScope::Global) {
        super::backup::backup_gitconfig(backups_dir)?.map(|b| b.id)
    } else {
        None
    };

    let mut applied: Vec<String> = vec![];

    git_config::set_config(cfg_scope, "user.name", &profile.git.user_name)?;
    applied.push("user.name".into());

    git_config::set_config(cfg_scope, "user.email", &profile.git.user_email)?;
    applied.push("user.email".into());

    if let Some(key) = profile.git.signing_key.as_ref() {
        if key.is_empty() {
            git_config::unset_config(cfg_scope, "user.signingkey")?;
        } else {
            git_config::set_config(cfg_scope, "user.signingkey", key)?;
            applied.push("user.signingkey".into());
        }
    } else {
        git_config::unset_config(cfg_scope, "user.signingkey")?;
    }

    if let Some(gpg) = profile.git.gpg_sign {
        git_config::set_config(
            cfg_scope,
            "commit.gpgsign",
            if gpg { "true" } else { "false" },
        )?;
        applied.push("commit.gpgsign".into());
    } else {
        git_config::unset_config(cfg_scope, "commit.gpgsign")?;
    }

    if let Some(branch) = profile.git.default_branch.as_ref() {
        if !branch.is_empty() {
            git_config::set_config(cfg_scope, "init.defaultBranch", branch)?;
            applied.push("init.defaultBranch".into());
        }
    }

    for (k, v) in &profile.git.custom_config {
        git_config::set_config(cfg_scope, k, v)?;
        applied.push(k.clone());
    }

    Ok(ApplyOutcome {
        backup_id,
        applied_keys: applied,
    })
}

pub fn make_record(
    profile: &Profile,
    scope: &SwitchScope,
    success: bool,
    error_message: Option<String>,
) -> SwitchRecord {
    let (scope_str, target) = match scope {
        SwitchScope::Global => ("global".to_string(), None),
        SwitchScope::Local { path } => ("local".to_string(), Some(path.clone())),
    };
    SwitchRecord {
        id: uuid::Uuid::new_v4().to_string(),
        profile_id: profile.id.clone(),
        profile_name: profile.name.clone(),
        scope: scope_str,
        target_path: target,
        timestamp: chrono::Utc::now(),
        success,
        error_message,
    }
}

#[allow(dead_code)]
pub fn _scope_marker(_: Scope) {}
