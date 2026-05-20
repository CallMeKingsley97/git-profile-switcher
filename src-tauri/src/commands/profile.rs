use tauri::State;

use crate::core::error::{AppError, AppResult};
use crate::core::profile::Profile;
use crate::AppState;

#[tauri::command]
pub fn list_profiles(state: State<'_, AppState>) -> AppResult<Vec<Profile>> {
    let store = state.store.lock().unwrap();
    Ok(store.data.profiles.clone())
}

#[tauri::command]
pub fn get_profile(state: State<'_, AppState>, id: String) -> AppResult<Profile> {
    let store = state.store.lock().unwrap();
    store
        .find(&id)
        .cloned()
        .ok_or_else(|| AppError::NotFound(format!("profile {id}")))
}

#[tauri::command]
pub fn create_profile(state: State<'_, AppState>, profile: Profile) -> AppResult<Profile> {
    let mut store = state.store.lock().unwrap();
    let mut p = profile;
    if p.id.is_empty() {
        p.id = uuid::Uuid::new_v4().to_string();
    }
    let now = chrono::Utc::now();
    p.created_at = now;
    p.updated_at = now;
    store.data.profiles.push(p.clone());
    store.save()?;
    Ok(p)
}

#[tauri::command]
pub fn update_profile(
    state: State<'_, AppState>,
    id: String,
    profile: Profile,
) -> AppResult<Profile> {
    let mut store = state.store.lock().unwrap();
    let target = store
        .find_mut(&id)
        .ok_or_else(|| AppError::NotFound(format!("profile {id}")))?;
    let created_at = target.created_at;
    *target = Profile {
        id: id.clone(),
        created_at,
        updated_at: chrono::Utc::now(),
        ..profile
    };
    let snapshot = target.clone();
    store.save()?;
    Ok(snapshot)
}

#[tauri::command]
pub fn delete_profile(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let mut store = state.store.lock().unwrap();
    let before = store.data.profiles.len();
    store.data.profiles.retain(|p| p.id != id);
    if store.data.profiles.len() == before {
        return Err(AppError::NotFound(format!("profile {id}")));
    }
    if store.data.active_profile_id.as_deref() == Some(id.as_str()) {
        store.data.active_profile_id = None;
    }
    store.save()?;
    Ok(())
}

#[tauri::command]
pub fn duplicate_profile(state: State<'_, AppState>, id: String) -> AppResult<Profile> {
    let mut store = state.store.lock().unwrap();
    let original = store
        .find(&id)
        .cloned()
        .ok_or_else(|| AppError::NotFound(format!("profile {id}")))?;
    let now = chrono::Utc::now();
    let copy = Profile {
        id: uuid::Uuid::new_v4().to_string(),
        name: format!("{} (副本)", original.name),
        created_at: now,
        updated_at: now,
        last_used_at: None,
        ..original
    };
    store.data.profiles.push(copy.clone());
    store.save()?;
    Ok(copy)
}

#[tauri::command]
pub fn get_active_profile(state: State<'_, AppState>) -> AppResult<Option<Profile>> {
    let store = state.store.lock().unwrap();
    Ok(store
        .data
        .active_profile_id
        .as_ref()
        .and_then(|id| store.find(id).cloned()))
}
