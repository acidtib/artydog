//! Registers the overlay toggle shortcut and routes presses to the overlay.
//!
//! Only `ShortcutState::Pressed` toggles. Releases and key repeats are
//! ignored so a single keypress never toggles twice.
//!
//! A registered shortcut is exclusive on every platform: the foreground app
//! never sees the key. That is why the default carries a modifier, and why a
//! user who rebinds this onto a key the game needs will lose it in game.

use std::str::FromStr;

use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

use crate::config;
use crate::overlay::{OverlayController, OverlayManager};
use crate::state::{AppState, DEFAULT_HOTKEY};

fn parse(shortcut: &str) -> Result<Shortcut, String> {
    Shortcut::from_str(shortcut).map_err(|e| format!("\"{shortcut}\" is not a valid shortcut: {e}"))
}

/// The shortcut in use, which is the default until the user changes it.
pub fn current_hotkey(app: &AppHandle) -> String {
    let state = app.state::<AppState>();
    let app_state: &AppState = &state;
    app_state
        .hotkey
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_else(|_| DEFAULT_HOTKEY.to_string())
}

fn record(state: &AppState, shortcut: &str, error: Option<String>) {
    if let Ok(mut guard) = state.hotkey.lock() {
        *guard = shortcut.to_string();
    }
    if let Ok(mut guard) = state.hotkey_error.lock() {
        *guard = error;
    }
}

/// Registers `shortcut`, replacing whatever was registered before. The old
/// binding is released first so a failure cannot leave both live.
fn register(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    let parsed = parse(shortcut)?;
    let previous = current_hotkey(app);
    if let Ok(previous) = parse(&previous) {
        let _ = app.global_shortcut().unregister(previous);
    }
    app.global_shortcut().register(parsed).map_err(|e| {
        format!("failed to register \"{shortcut}\": {e}. Another application may already use it.")
    })
}

/// Registers the stored shortcut at startup. A failure is recorded rather
/// than returned: the app still runs, and the main window surfaces it.
pub fn register_saved_hotkey(app: &AppHandle) {
    let shortcut = config::hotkey(app).unwrap_or_else(|| DEFAULT_HOTKEY.to_string());
    let state = app.state::<AppState>();
    match register(app, &shortcut) {
        Ok(()) => record(&state, &shortcut, None),
        Err(e) => {
            eprintln!("[hotkey] {e}");
            record(&state, &shortcut, Some(e));
        }
    }
}

/// Switches to `shortcut` and persists it. On failure the previous binding is
/// restored, so a rejected shortcut never leaves the app without one.
pub fn set_hotkey(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    let previous = current_hotkey(app);
    register(app, shortcut)?;
    record(&app.state::<AppState>(), shortcut, None);
    if let Err(e) = config::save_hotkey(app, shortcut) {
        eprintln!("[hotkey] failed to save shortcut: {e}");
    }
    if previous != shortcut {
        eprintln!("[hotkey] toggle is now \"{shortcut}\"");
    }
    Ok(())
}

pub fn handle_hotkey(app: &AppHandle) {
    let manager = OverlayManager::new(app.clone());
    if let Err(e) = manager.toggle() {
        eprintln!("[hotkey] overlay toggle failed: {e}");
    }
}

pub fn hotkey_registered(app: &AppHandle) -> bool {
    parse(&current_hotkey(app))
        .map(|shortcut| app.global_shortcut().is_registered(shortcut))
        .unwrap_or(false)
}
