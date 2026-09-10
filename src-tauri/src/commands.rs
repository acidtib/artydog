//! Tauri commands - the only bridge between React and the overlay.
//!
//! Flow is always: React -> command -> OverlayManager -> Tauri window.

use tauri::{AppHandle, State};

use crate::hotkey::{manager::hotkey_registered, TOGGLE_SHORTCUT_LABEL};
use crate::overlay::{OverlayController, OverlayManager};
use crate::state::{AppState, HotkeyStatus, OverlayGeometry, OverlayStatus};

fn status(manager: &OverlayManager) -> Result<OverlayStatus, String> {
    Ok(OverlayStatus {
        visible: manager.is_visible()?,
    })
}

#[tauri::command]
pub fn show_overlay(app: AppHandle, _state: State<'_, AppState>) -> Result<OverlayStatus, String> {
    let manager = OverlayManager::new(app);
    manager.show()?;
    status(&manager)
}

#[tauri::command]
pub fn hide_overlay(app: AppHandle, _state: State<'_, AppState>) -> Result<OverlayStatus, String> {
    let manager = OverlayManager::new(app);
    manager.hide()?;
    status(&manager)
}

#[tauri::command]
pub fn toggle_overlay(
    app: AppHandle,
    _state: State<'_, AppState>,
) -> Result<OverlayStatus, String> {
    let manager = OverlayManager::new(app);
    manager.toggle()?;
    status(&manager)
}

#[tauri::command]
pub fn get_overlay_state(app: AppHandle) -> Result<OverlayStatus, String> {
    let manager = OverlayManager::new(app);
    status(&manager)
}

#[tauri::command]
pub fn get_overlay_geometry(app: AppHandle) -> Result<OverlayGeometry, String> {
    OverlayManager::new(app).geometry()
}

#[tauri::command]
pub fn set_overlay_position(app: AppHandle, x: i32, y: i32) -> Result<OverlayGeometry, String> {
    let manager = OverlayManager::new(app);
    manager.set_position(x, y)?;
    manager.geometry()
}

#[tauri::command]
pub fn set_overlay_size(
    app: AppHandle,
    width: u32,
    height: u32,
) -> Result<OverlayGeometry, String> {
    let manager = OverlayManager::new(app);
    manager.set_size(width, height)?;
    manager.geometry()
}

#[tauri::command]
pub fn get_hotkey_status(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<HotkeyStatus, String> {
    let error = state
        .hotkey_error
        .lock()
        .map_err(|e| format!("hotkey state lock poisoned: {e}"))?
        .clone();
    Ok(HotkeyStatus {
        shortcut: TOGGLE_SHORTCUT_LABEL.to_string(),
        registered: error.is_none() && hotkey_registered(&app),
        error,
    })
}
