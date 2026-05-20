use std::collections::BTreeMap;
use std::path::PathBuf;
use std::process::Command;

use serde::{Deserialize, Serialize};

use super::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GitConfigSnapshot {
    pub user_name: Option<String>,
    pub user_email: Option<String>,
    pub signing_key: Option<String>,
    pub gpg_sign: Option<bool>,
    pub default_branch: Option<String>,
    pub raw: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Copy)]
pub enum ConfigScope<'a> {
    Global,
    Local(&'a std::path::Path),
}

fn git_args<'a>(scope: ConfigScope<'a>) -> Vec<String> {
    match scope {
        ConfigScope::Global => vec!["config".into(), "--global".into()],
        ConfigScope::Local(_) => vec!["config".into(), "--local".into()],
    }
}

fn run_git(cwd: Option<&std::path::Path>, args: &[String]) -> AppResult<String> {
    let mut cmd = Command::new("git");
    if let Some(p) = cwd {
        cmd.current_dir(p);
    }
    cmd.args(args);
    let output = cmd
        .output()
        .map_err(|e| AppError::CommandFailed(format!("git not found: {e}")))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(AppError::CommandFailed(format!(
            "git {:?} failed: {stderr}",
            args
        )));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn read_snapshot(scope: ConfigScope) -> AppResult<GitConfigSnapshot> {
    let cwd = match scope {
        ConfigScope::Local(p) => Some(p),
        ConfigScope::Global => None,
    };
    let mut args = git_args(scope);
    args.push("--list".into());

    let stdout = match run_git(cwd, &args) {
        Ok(s) => s,
        Err(_) => return Ok(GitConfigSnapshot::default()),
    };

    let mut snap = GitConfigSnapshot::default();
    for line in stdout.lines() {
        if let Some(idx) = line.find('=') {
            let key = line[..idx].trim().to_string();
            let value = line[idx + 1..].to_string();
            match key.as_str() {
                "user.name" => snap.user_name = Some(value.clone()),
                "user.email" => snap.user_email = Some(value.clone()),
                "user.signingkey" => snap.signing_key = Some(value.clone()),
                "commit.gpgsign" => {
                    snap.gpg_sign = Some(matches!(value.to_lowercase().as_str(), "true" | "1"))
                }
                "init.defaultbranch" => snap.default_branch = Some(value.clone()),
                _ => {}
            }
            snap.raw.insert(key, value);
        }
    }
    Ok(snap)
}

pub fn set_config(scope: ConfigScope, key: &str, value: &str) -> AppResult<()> {
    let cwd = match scope {
        ConfigScope::Local(p) => Some(p),
        ConfigScope::Global => None,
    };
    let mut args = git_args(scope);
    args.push(key.into());
    args.push(value.into());
    run_git(cwd, &args)?;
    Ok(())
}

pub fn unset_config(scope: ConfigScope, key: &str) -> AppResult<()> {
    let cwd = match scope {
        ConfigScope::Local(p) => Some(p),
        ConfigScope::Global => None,
    };
    let mut args = git_args(scope);
    args.push("--unset".into());
    args.push(key.into());
    let _ = run_git(cwd, &args);
    Ok(())
}

pub fn gitconfig_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".gitconfig"))
}
