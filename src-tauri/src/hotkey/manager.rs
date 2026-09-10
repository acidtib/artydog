//! Registers the global `M` shortcut and routes presses to the overlay.
//!
//! Only `ShortcutState::Pressed` toggles. Releases and key repeats are
//! ignored so a single keypress never toggles twice.

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut};

use crate::overlay::{OverlayController, OverlayManager};

pub const TOGGLE_SHORTCUT_LABEL: &str = "M";

fn toggle_shortcut() -> Result<Shortcut, String> {
    Ok(Shortcut::new(None, Code::KeyM))
}

pub fn register_toggle_shortcut(app: &AppHandle) -> Result<(), String> {
    let shortcut = toggle_shortcut()?;
    app.global_shortcut().register(shortcut).map_err(|e| {
        format!(
            "failed to register global shortcut \"{TOGGLE_SHORTCUT_LABEL}\": {e}. \
                 Another application may already use this key."
        )
    })
}

pub fn handle_hotkey(app: &AppHandle) {
    let manager = OverlayManager::new(app.clone());
    if let Err(e) = manager.toggle() {
        eprintln!("[hotkey] overlay toggle failed: {e}");
    }
}

pub fn hotkey_registered(app: &AppHandle) -> bool {
    match toggle_shortcut() {
        Ok(shortcut) => app.global_shortcut().is_registered(shortcut),
        Err(_) => false,
    }
}
