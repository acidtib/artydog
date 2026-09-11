//! Fallback for platforms without a dedicated module.

use crate::overlay::OverlayResult;

pub fn name() -> &'static str {
    "unsupported"
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
