use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::error::AppResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshKeyInfo {
    pub name: String,
    pub private_path: String,
    pub public_path: Option<String>,
    pub public_fingerprint: Option<String>,
    pub key_type: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SshHostEntry {
    pub host: String,
    pub host_name: Option<String>,
    pub user: Option<String>,
    pub identity_file: Option<String>,
    pub port: Option<u16>,
}

pub fn ssh_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".ssh"))
}

pub fn ssh_config_path() -> Option<PathBuf> {
    ssh_dir().map(|d| d.join("config"))
}

/// 仅元信息：私钥路径 + 公钥指纹/注释，不读取私钥内容
pub fn enumerate_keys() -> AppResult<Vec<SshKeyInfo>> {
    let Some(dir) = ssh_dir() else {
        return Ok(vec![]);
    };
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut keys: Vec<SshKeyInfo> = vec![];
    let read = std::fs::read_dir(&dir)?;
    for entry in read.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if !path.is_file() || name.ends_with(".pub") {
            continue;
        }
        if matches!(name.as_str(), "config" | "known_hosts" | "authorized_keys")
            || name.ends_with(".bak")
        {
            continue;
        }
        let looks_like_key = name.starts_with("id_")
            || name.ends_with("_rsa")
            || name.ends_with("_ed25519")
            || name.ends_with("_ecdsa")
            || name.ends_with("_dsa");
        if !looks_like_key {
            continue;
        }
        let pub_path = path.with_extension("pub");
        let (pub_path_str, key_type, comment) = if pub_path.exists() {
            let content = std::fs::read_to_string(&pub_path).unwrap_or_default();
            let parts: Vec<&str> = content.split_whitespace().collect();
            let key_type = parts.first().map(|s| s.to_string());
            let comment = if parts.len() >= 3 {
                Some(parts[2..].join(" "))
            } else {
                None
            };
            (Some(pub_path.to_string_lossy().to_string()), key_type, comment)
        } else {
            (None, None, None)
        };

        keys.push(SshKeyInfo {
            name,
            private_path: path.to_string_lossy().to_string(),
            public_path: pub_path_str,
            public_fingerprint: None, // MVP: 跳过 ssh-keygen -lf 的子进程调用
            key_type,
            comment,
        });
    }
    keys.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(keys)
}

pub fn parse_ssh_config(path: &Path) -> AppResult<Vec<SshHostEntry>> {
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = std::fs::read_to_string(path)?;
    let mut entries: Vec<SshHostEntry> = vec![];
    let mut current: Option<SshHostEntry> = None;

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let (key, value) = match line.split_once(|c: char| c.is_whitespace() || c == '=') {
            Some((k, v)) => (k.trim().to_lowercase(), v.trim().trim_matches('"').to_string()),
            None => continue,
        };
        match key.as_str() {
            "host" => {
                if let Some(e) = current.take() {
                    entries.push(e);
                }
                current = Some(SshHostEntry {
                    host: value,
                    ..Default::default()
                });
            }
            "hostname" => {
                if let Some(c) = current.as_mut() {
                    c.host_name = Some(value);
                }
            }
            "user" => {
                if let Some(c) = current.as_mut() {
                    c.user = Some(value);
                }
            }
            "identityfile" => {
                if let Some(c) = current.as_mut() {
                    c.identity_file = Some(value);
                }
            }
            "port" => {
                if let Some(c) = current.as_mut() {
                    c.port = value.parse().ok();
                }
            }
            _ => {}
        }
    }
    if let Some(e) = current {
        entries.push(e);
    }
    Ok(entries)
}
