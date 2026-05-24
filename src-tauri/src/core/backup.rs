use std::path::{Path, PathBuf};

use chrono::Utc;
use serde::{Deserialize, Serialize};

use super::error::{AppError, AppResult};
use super::git_config::gitconfig_path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupEntry {
    pub id: String,
    pub kind: String,
    pub path: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub fn backup_gitconfig(backups_dir: &Path) -> AppResult<Option<BackupEntry>> {
    let Some(src) = gitconfig_path() else {
        return Ok(None);
    };
    if !src.exists() {
        return Ok(None);
    }
    std::fs::create_dir_all(backups_dir)?;
    let ts = Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let id = format!("gitconfig-{ts}");
    let dest = backups_dir.join(format!("{id}.bak"));
    std::fs::copy(&src, &dest)?;
    Ok(Some(BackupEntry {
        id,
        kind: "gitconfig".into(),
        path: dest.to_string_lossy().to_string(),
        created_at: Utc::now(),
    }))
}

pub fn backup_ssh_config(backups_dir: &Path) -> AppResult<Option<BackupEntry>> {
    let Some(src) = super::ssh_config::ssh_config_path() else {
        return Ok(None);
    };
    if !src.exists() {
        return Ok(None);
    }
    std::fs::create_dir_all(backups_dir)?;
    let ts = Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let id = format!("ssh-config-{ts}");
    let dest = backups_dir.join(format!("{id}.bak"));
    std::fs::copy(&src, &dest)?;
    Ok(Some(BackupEntry {
        id,
        kind: "ssh-config".into(),
        path: dest.to_string_lossy().to_string(),
        created_at: Utc::now(),
    }))
}

pub fn list_backups(backups_dir: &Path) -> AppResult<Vec<BackupEntry>> {
    if !backups_dir.exists() {
        return Ok(vec![]);
    }
    let mut out: Vec<BackupEntry> = vec![];
    for entry in std::fs::read_dir(backups_dir)?.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let file_name = entry.file_name().to_string_lossy().to_string();
        let id = file_name.trim_end_matches(".bak").to_string();
        let metadata = entry.metadata()?;
        let modified = metadata.modified().ok();
        let created_at = modified
            .map(|t| chrono::DateTime::<Utc>::from(t))
            .unwrap_or_else(Utc::now);
        let kind = if id.starts_with("gitconfig") {
            "gitconfig"
        } else if id.starts_with("ssh-config") {
            "ssh-config"
        } else {
            "other"
        };
        out.push(BackupEntry {
            id,
            kind: kind.into(),
            path: path.to_string_lossy().to_string(),
            created_at,
        });
    }
    out.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(out)
}

pub fn restore_backup(backups_dir: &Path, backup_id: &str) -> AppResult<()> {
    let file = backups_dir.join(format!("{backup_id}.bak"));
    if !file.exists() {
        return Err(AppError::NotFound(format!("backup {backup_id}")));
    }
    let target: PathBuf = if backup_id.starts_with("gitconfig") {
        gitconfig_path().ok_or_else(|| AppError::Other("no home dir".into()))?
    } else if backup_id.starts_with("ssh-config") {
        super::ssh_config::ssh_config_path().ok_or_else(|| AppError::Other("no home dir".into()))?
    } else {
        return Err(AppError::InvalidArgument(format!(
            "unknown backup kind: {backup_id}"
        )));
    };
    std::fs::copy(&file, &target)?;
    Ok(())
}

pub fn prune(backups_dir: &Path, max: usize) -> AppResult<()> {
    let mut list = list_backups(backups_dir)?;
    if list.len() <= max {
        return Ok(());
    }
    let to_remove = list.split_off(max);
    for b in to_remove {
        let _ = std::fs::remove_file(&b.path);
    }
    Ok(())
}
