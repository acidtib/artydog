//! Windows-specific overlay behavior.
//!
//! Phase 1 intentionally uses only Tauri APIs here. Native Win32 z-order or
//! focus workarounds belong in this file if they ever become necessary.

use crate::overlay::OverlayResult;

pub fn name() -> &'static str {
    "windows"
}

pub fn after_show(_window: &tauri::WebviewWindow) -> OverlayResult<()> {
    Ok(())
}
