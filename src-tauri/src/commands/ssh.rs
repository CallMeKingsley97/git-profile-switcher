use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};

use crate::core::error::{AppError, AppResult};
use crate::core::ssh_config::{self, SshKeyInfo};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshTestResult {
    pub host: String,
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub fn list_ssh_keys() -> AppResult<Vec<SshKeyInfo>> {
    ssh_config::enumerate_keys()
}

#[tauri::command]
pub fn generate_ssh_key(
    key_type: String,
    file_name: String,
    comment: String,
    passphrase: Option<String>,
) -> AppResult<SshKeyInfo> {
    let key_type = normalize_key_type(&key_type)?;
    let file_name = sanitize_file_name(&file_name)?;
    let Some(dir) = ssh_config::ssh_dir() else {
        return Err(AppError::Other("no home dir".into()));
    };
    std::fs::create_dir_all(&dir)?;

    let private_path = dir.join(file_name);
    ensure_inside_dir(&dir, &private_path)?;
    if private_path.exists() || private_path.with_extension("pub").exists() {
        return Err(AppError::InvalidArgument("SSH key already exists".into()));
    }

    let mut cmd = Command::new("ssh-keygen");
    cmd.arg("-t")
        .arg(key_type)
        .arg("-f")
        .arg(&private_path)
        .arg("-C")
        .arg(comment.trim())
        .arg("-N")
        .arg(passphrase.unwrap_or_default());
    if key_type == "rsa" {
        cmd.arg("-b").arg("4096");
    }

    let output = cmd.output()?;
    if !output.status.success() {
        return Err(AppError::CommandFailed(command_output_message(&output)));
    }

    let private_path_str = private_path.to_string_lossy().to_string();
    ssh_config::enumerate_keys()?
        .into_iter()
        .find(|key| key.private_path == private_path_str)
        .ok_or_else(|| AppError::Other("generated SSH key was not found".into()))
}

#[tauri::command]
pub fn read_ssh_public_key(path: String) -> AppResult<String> {
    let Some(dir) = ssh_config::ssh_dir() else {
        return Err(AppError::Other("no home dir".into()));
    };
    let pub_path = PathBuf::from(&path);
    if pub_path.extension().and_then(|e| e.to_str()) != Some("pub") {
        return Err(AppError::InvalidArgument("not a public key file".into()));
    }
    let dir = dir.canonicalize().unwrap_or(dir);
    let canonical = pub_path
        .canonicalize()
        .map_err(|_| AppError::InvalidArgument("public key not found".into()))?;
    if !canonical.starts_with(&dir) {
        return Err(AppError::InvalidArgument("path outside ~/.ssh".into()));
    }
    Ok(std::fs::read_to_string(canonical)?.trim().to_string())
}

#[tauri::command]
pub fn test_ssh_connection(host: String) -> AppResult<SshTestResult> {
    let host = sanitize_host(&host)?;
    let output = Command::new("ssh")
        .arg("-T")
        .arg("-o")
        .arg("BatchMode=yes")
        .arg("-o")
        .arg("ConnectTimeout=10")
        .arg(&host)
        .output()?;

    let message = command_output_message(&output);
    let success = output.status.success()
        || message.contains("successfully authenticated")
        || message.to_lowercase().contains("welcome to");

    Ok(SshTestResult {
        host,
        success,
        message,
    })
}

fn normalize_key_type(input: &str) -> AppResult<&'static str> {
    match input.trim().to_lowercase().as_str() {
        "ed25519" => Ok("ed25519"),
        "rsa" => Ok("rsa"),
        "ecdsa" => Ok("ecdsa"),
        other => Err(AppError::InvalidArgument(format!(
            "unsupported SSH key type: {other}"
        ))),
    }
}

fn sanitize_file_name(input: &str) -> AppResult<String> {
    let value = input.trim();
    if value.is_empty()
        || value == "."
        || value == ".."
        || value.contains('/')
        || value.contains('\\')
        || value.chars().any(char::is_whitespace)
    {
        return Err(AppError::InvalidArgument("invalid SSH key file name".into()));
    }
    Ok(value.to_string())
}

fn sanitize_host(input: &str) -> AppResult<String> {
    let value = input.trim();
    if value.is_empty()
        || value.chars().any(|c| {
            !(c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | '@' | ':'))
        })
    {
        return Err(AppError::InvalidArgument("invalid SSH host".into()));
    }
    Ok(value.to_string())
}

fn ensure_inside_dir(dir: &Path, path: &PathBuf) -> AppResult<()> {
    let dir = dir.canonicalize().unwrap_or_else(|_| dir.to_path_buf());
    let parent = path
        .parent()
        .ok_or_else(|| AppError::InvalidArgument("invalid SSH key path".into()))?;
    let parent = parent.canonicalize().unwrap_or_else(|_| parent.to_path_buf());
    if parent != dir {
        return Err(AppError::InvalidArgument("invalid SSH key path".into()));
    }
    Ok(())
}

fn command_output_message(output: &std::process::Output) -> String {
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    match (stdout.is_empty(), stderr.is_empty()) {
        (false, false) => format!("{stdout}\n{stderr}"),
        (false, true) => stdout,
        (true, false) => stderr,
        (true, true) => format!("exit status: {}", output.status),
    }
}
