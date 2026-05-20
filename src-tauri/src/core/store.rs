use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use super::error::AppResult;
use super::profile::{Profile, SwitchRecord};

const PROFILES_FILE: &str = "profiles.json";
const HISTORY_FILE: &str = "history.json";
const FLAGS_FILE: &str = "flags.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProfilesData {
    pub version: u32,
    pub profiles: Vec<Profile>,
    pub active_profile_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Flags {
    pub first_run_completed: bool,
    pub first_run_completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug)]
pub struct Store {
    config_dir: PathBuf,
    pub data: ProfilesData,
    pub history: Vec<SwitchRecord>,
    pub flags: Flags,
}

impl Store {
    pub fn load_or_init(config_dir: &Path) -> AppResult<Self> {
        std::fs::create_dir_all(config_dir)?;
        let data = read_json(&config_dir.join(PROFILES_FILE)).unwrap_or_else(|| ProfilesData {
            version: 1,
            ..Default::default()
        });
        let history: Vec<SwitchRecord> =
            read_json(&config_dir.join(HISTORY_FILE)).unwrap_or_default();
        let flags: Flags = read_json(&config_dir.join(FLAGS_FILE)).unwrap_or_default();
        Ok(Self {
            config_dir: config_dir.to_path_buf(),
            data,
            history,
            flags,
        })
    }

    pub fn config_dir(&self) -> &Path {
        &self.config_dir
    }

    pub fn backups_dir(&self) -> PathBuf {
        self.config_dir.join("backups")
    }

    pub fn save(&self) -> AppResult<()> {
        write_json(&self.config_dir.join(PROFILES_FILE), &self.data)?;
        write_json(&self.config_dir.join(HISTORY_FILE), &self.history)?;
        write_json(&self.config_dir.join(FLAGS_FILE), &self.flags)?;
        Ok(())
    }

    pub fn find(&self, id: &str) -> Option<&Profile> {
        self.data.profiles.iter().find(|p| p.id == id)
    }

    pub fn find_mut(&mut self, id: &str) -> Option<&mut Profile> {
        self.data.profiles.iter_mut().find(|p| p.id == id)
    }

    pub fn push_history(&mut self, record: SwitchRecord, max: usize) {
        self.history.insert(0, record);
        if self.history.len() > max {
            self.history.truncate(max);
        }
    }
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Option<T> {
    let bytes = std::fs::read(path).ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> AppResult<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let bytes = serde_json::to_vec_pretty(value)?;
    std::fs::write(path, bytes)?;
    Ok(())
}
