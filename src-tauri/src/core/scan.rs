use std::collections::HashSet;
use std::path::PathBuf;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::error::AppResult;
use super::git_config::{self, ConfigScope, GitConfigSnapshot};
use super::profile::GitIdentity;
use super::ssh_config::{self, SshHostEntry, SshKeyInfo};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredIdentity {
    pub source: String,
    pub user_name: Option<String>,
    pub user_email: Option<String>,
    pub directory: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvScanReport {
    pub global_git_config: GitConfigSnapshot,
    pub ssh_keys: Vec<SshKeyInfo>,
    pub ssh_config_hosts: Vec<SshHostEntry>,
    pub gpg_keys: Vec<GpgKeyInfo>,
    pub discovered_identities: Vec<DiscoveredIdentity>,
    pub scanned_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpgKeyInfo {
    pub key_id: String,
    pub uid: Option<String>,
    pub expires: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileDraft {
    pub name: String,
    pub git: GitIdentity,
    pub ssh_key_path: Option<String>,
    pub make_active: bool,
}

pub fn scan() -> AppResult<EnvScanReport> {
    let global = git_config::read_snapshot(ConfigScope::Global).unwrap_or_default();

    let ssh_keys = ssh_config::enumerate_keys().unwrap_or_default();
    let ssh_config_hosts = match ssh_config::ssh_config_path() {
        Some(p) => ssh_config::parse_ssh_config(&p).unwrap_or_default(),
        None => vec![],
    };

    let gpg_keys = list_gpg_keys().unwrap_or_default();

    let discovered = discover_directory_identities();

    Ok(EnvScanReport {
        global_git_config: global,
        ssh_keys,
        ssh_config_hosts,
        gpg_keys,
        discovered_identities: discovered,
        scanned_at: Utc::now(),
    })
}

fn list_gpg_keys() -> AppResult<Vec<GpgKeyInfo>> {
    let output = match std::process::Command::new("gpg")
        .args(["--list-secret-keys", "--with-colons", "--keyid-format=long"])
        .output()
    {
        Ok(o) => o,
        Err(_) => return Ok(vec![]),
    };
    if !output.status.success() {
        return Ok(vec![]);
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut keys: Vec<GpgKeyInfo> = vec![];
    let mut current: Option<GpgKeyInfo> = None;
    for line in stdout.lines() {
        let parts: Vec<&str> = line.split(':').collect();
        if parts.is_empty() {
            continue;
        }
        match parts[0] {
            "sec" => {
                if let Some(k) = current.take() {
                    keys.push(k);
                }
                if let Some(key_id) = parts.get(4) {
                    current = Some(GpgKeyInfo {
                        key_id: key_id.to_string(),
                        uid: None,
                        expires: parts
                            .get(6)
                            .filter(|s| !s.is_empty())
                            .map(|s| s.to_string()),
                    });
                }
            }
            "uid" => {
                if let Some(c) = current.as_mut() {
                    if c.uid.is_none() {
                        c.uid = parts.get(9).map(|s| s.to_string());
                    }
                }
            }
            _ => {}
        }
    }
    if let Some(k) = current {
        keys.push(k);
    }
    Ok(keys)
}

/// 浅扫常见目录下 .git/config 中的 user.email
fn discover_directory_identities() -> Vec<DiscoveredIdentity> {
    let Some(home) = dirs::home_dir() else {
        return vec![];
    };
    let roots = [
        "work",
        "personal",
        "code",
        "projects",
        "Documents/code",
        "Documents/work",
    ];
    let mut seen: HashSet<String> = HashSet::new();
    let mut out: Vec<DiscoveredIdentity> = vec![];

    for root in roots {
        let path = home.join(root);
        if !path.exists() {
            continue;
        }
        for entry in walkdir::WalkDir::new(&path)
            .max_depth(3)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_dir() {
                continue;
            }
            if entry.file_name() == ".git" {
                let cfg = entry.path().join("config");
                if let Some((name, email)) = parse_local_identity(&cfg) {
                    let dir = entry
                        .path()
                        .parent()
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_default();
                    let key = format!("{}|{}", email.as_deref().unwrap_or(""), dir);
                    if seen.insert(key) {
                        out.push(DiscoveredIdentity {
                            source: "local-repo".into(),
                            user_name: name,
                            user_email: email,
                            directory: Some(dir),
                        });
                    }
                }
            }
        }
    }
    out
}

fn parse_local_identity(config: &PathBuf) -> Option<(Option<String>, Option<String>)> {
    let content = std::fs::read_to_string(config).ok()?;
    let mut in_user = false;
    let mut name: Option<String> = None;
    let mut email: Option<String> = None;
    for raw in content.lines() {
        let line = raw.trim();
        if line.starts_with('[') {
            in_user = line.eq_ignore_ascii_case("[user]");
            continue;
        }
        if !in_user {
            continue;
        }
        if let Some((k, v)) = line.split_once('=') {
            let key = k.trim().to_lowercase();
            let value = v.trim().trim_matches('"').to_string();
            match key.as_str() {
                "name" => name = Some(value),
                "email" => email = Some(value),
                _ => {}
            }
        }
    }
    if name.is_some() || email.is_some() {
        Some((name, email))
    } else {
        None
    }
}
