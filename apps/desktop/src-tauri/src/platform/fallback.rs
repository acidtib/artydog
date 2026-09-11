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
