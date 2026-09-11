//! Linux-specific overlay behavior (primary target: KDE Plasma / Wayland).
//!
//! Phase 1 intentionally uses only Tauri APIs here. Wayland leaves window
//! placement, stacking, and activation to the compositor, so if KWin ever
//! needs a workaround (e.g. re-asserting stacking order after `show`), it
//! belongs in [`after_show`] and nowhere else.

use crate::overlay::OverlayResult;

pub fn name() -> &'static str {
    "linux"
}

pub fn after_show(window: &tauri::WebviewWindow) -> OverlayResult<()> {
    window
        .set_always_on_top(true)
        .map_err(|e| format!("failed to pin overlay on top: {e}"))?;
    Ok(())
}

/// No pass-through toggle here, so the caller falls back to the global
/// shortcut plugin and its exclusive grab.
pub fn install_toggle_hook(_app: &tauri::AppHandle) -> Result<bool, String> {
    Ok(false)
}

pub fn toggle_hook_installed() -> bool {
    false
}
