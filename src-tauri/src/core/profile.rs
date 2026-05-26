use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GitIdentity {
    pub user_name: String,
    pub user_email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signing_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpg_sign: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_branch: Option<String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub custom_config: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SshConfig {
    pub key_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host_alias: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub real_host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Scope {
    Global,
    Directory,
}

impl Default for Scope {
    fn default() -> Self {
        Scope::Global
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,

    pub git: GitIdentity,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ssh: Option<SshConfig>,

    #[serde(default)]
    pub scope: Scope,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub directories: Vec<String>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_used_at: Option<DateTime<Utc>>,
}

impl Profile {
    pub fn new(name: String, git: GitIdentity) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            color: None,
            icon: None,
            git,
            ssh: None,
            scope: Scope::Global,
            directories: Vec::new(),
            created_at: now,
            updated_at: now,
            last_used_at: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchRecord {
    pub id: String,
    pub profile_id: String,
    pub profile_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub profile_email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub profile_user_name: Option<String>,
    pub scope: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_path: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}
