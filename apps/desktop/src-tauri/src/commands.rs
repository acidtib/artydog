//! Tauri commands - the only bridge between React and the overlay.
//!
//! Flow is always: React -> command -> OverlayManager -> Tauri window.

use tauri::{AppHandle, Emitter, State};

use crate::hotkey::{self, manager::hotkey_registered};
use crate::overlay::{OverlayController, OverlayManager};
use crate::state::{AppState, CalcState, HotkeyStatus, OverlayGeometry, OverlayStatus};

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
pub fn reset_overlay_geometry(app: AppHandle) -> Result<OverlayGeometry, String> {
    OverlayManager::new(app).reset_geometry()
}

fn hotkey_status(app: &AppHandle, state: &AppState) -> Result<HotkeyStatus, String> {
    let error = state
        .hotkey_error
        .lock()
        .map_err(|e| format!("hotkey state lock poisoned: {e}"))?
        .clone();
    Ok(HotkeyStatus {
        shortcut: hotkey::current_hotkey(app),
        registered: error.is_none() && hotkey_registered(app),
        error,
    })
}

#[tauri::command]
pub fn get_hotkey_status(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<HotkeyStatus, String> {
    hotkey_status(&app, &state)
}

#[tauri::command]
pub fn set_hotkey(
    app: AppHandle,
    state: State<'_, AppState>,
    shortcut: String,
) -> Result<HotkeyStatus, String> {
    hotkey::set_hotkey(&app, &shortcut)?;
    hotkey_status(&app, &state)
}

/// Mirrored by `CALC_STATE_EVENT` in `src/lib/calculatorState.ts`.
pub const CALC_STATE_EVENT: &str = "calc-state-changed";

#[tauri::command]
pub fn get_calc_state(state: State<'_, AppState>) -> Result<CalcState, String> {
    state
        .calc
        .lock()
        .map_err(|e| format!("calc state lock poisoned: {e}"))
        .map(|guard| guard.clone())
}

#[tauri::command]
pub fn set_calc_state(
    app: AppHandle,
    state: State<'_, AppState>,
    calc: CalcState,
) -> Result<CalcState, String> {
    *state
        .calc
        .lock()
        .map_err(|e| format!("calc state lock poisoned: {e}"))? = calc.clone();
    // Best-effort broadcast, same policy as the visibility event.
    if let Err(e) = app.emit(CALC_STATE_EVENT, &calc) {
        eprintln!("[calc] failed to emit calc state event: {e}");
    }
    Ok(calc)
}
