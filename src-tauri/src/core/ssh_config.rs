use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::error::{AppError, AppResult};
use super::profile::SshConfig;

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

pub fn update_host_config(cfg: &SshConfig) -> AppResult<bool> {
    let Some(path) = ssh_config_path() else {
        return Err(AppError::Other("no home dir".into()));
    };
    let key_path = cfg.key_path.trim();
    if key_path.is_empty() {
        return Ok(false);
    }
    let host = cfg.host_alias.as_deref().unwrap_or("github.com").trim();
    if host.is_empty() || host.contains(char::is_whitespace) {
        return Err(AppError::InvalidArgument("invalid SSH host alias".into()));
    }
    let real_host = cfg.real_host.as_deref().unwrap_or("github.com").trim();
    if real_host.is_empty() || real_host.contains(char::is_whitespace) {
        return Err(AppError::InvalidArgument("invalid SSH host name".into()));
    }

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let content = std::fs::read_to_string(&path).unwrap_or_default();
    let mut blocks: Vec<String> = vec![];
    let mut current: Vec<String> = vec![];
    let mut replaced = false;

    for line in content.lines() {
        if line.trim_start().to_lowercase().starts_with("host ") {
            if !current.is_empty() {
                blocks.push(render_or_keep_block(&current, cfg, host, real_host, &mut replaced));
                current.clear();
            }
        }
        current.push(line.to_string());
    }
    if !current.is_empty() {
        blocks.push(render_or_keep_block(&current, cfg, host, real_host, &mut replaced));
    }
    if !replaced {
        blocks.push(render_host_block(cfg, host, real_host));
    }

    let mut next = blocks.join("\n");
    if !next.ends_with('\n') {
        next.push('\n');
    }
    if next != content {
        std::fs::write(path, next)?;
        return Ok(true);
    }
    Ok(false)
}

fn render_or_keep_block(
    block: &[String],
    cfg: &SshConfig,
    host: &str,
    real_host: &str,
    replaced: &mut bool,
) -> String {
    if block_matches_host(block, host) {
        *replaced = true;
        render_host_block(cfg, host, real_host)
    } else {
        block.join("\n")
    }
}

fn block_matches_host(block: &[String], host: &str) -> bool {
    let Some(first) = block.first() else {
        return false;
    };
    let trimmed = first.trim();
    if !trimmed.to_lowercase().starts_with("host ") {
        return false;
    }
    trimmed[4..].split_whitespace().any(|candidate| candidate == host)
}

fn render_host_block(cfg: &SshConfig, host: &str, real_host: &str) -> String {
    let mut lines = vec![
        format!("Host {host}"),
        format!("  HostName {real_host}"),
        "  User git".to_string(),
        format!("  IdentityFile {}", cfg.key_path.trim()),
        "  IdentitiesOnly yes".to_string(),
    ];
    if let Some(port) = cfg.port {
        lines.push(format!("  Port {port}"));
    }
    lines.join("\n")
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
