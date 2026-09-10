use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub const OVERLAY_LABEL: &str = "overlay";
pub const MAIN_LABEL: &str = "main";
pub const OVERLAY_DEFAULT_WIDTH: u32 = 400;
pub const OVERLAY_DEFAULT_HEIGHT: u32 = 300;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct OverlayStatus {
    pub visible: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct OverlayGeometry {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl OverlayGeometry {
    pub fn defaults() -> Self {
        Self {
            x: 0,
            y: 0,
            width: OVERLAY_DEFAULT_WIDTH,
            height: OVERLAY_DEFAULT_HEIGHT,
        }
    }

    /// A copy with `x`/`y` replaced, keeping the current size.
    pub fn merged_position(self, x: i32, y: i32) -> Self {
        Self { x, y, ..self }
    }

    /// A copy with `width`/`height` replaced, keeping the current position.
    pub fn merged_size(self, width: u32, height: u32) -> Self {
        Self { width, height, ..self }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct HotkeyStatus {
    pub shortcut: String,
    pub registered: bool,
    pub error: Option<String>,
}

pub struct AppState {
    pub geometry: Mutex<Option<OverlayGeometry>>,
    pub hotkey_error: Mutex<Option<String>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            geometry: Mutex::new(None),
            hotkey_error: Mutex::new(None),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_match_declared_constants() {
        let geometry = OverlayGeometry::defaults();
        assert_eq!(geometry.x, 0);
        assert_eq!(geometry.y, 0);
        assert_eq!(geometry.width, OVERLAY_DEFAULT_WIDTH);
        assert_eq!(geometry.height, OVERLAY_DEFAULT_HEIGHT);
    }

    #[test]
    fn merged_position_updates_position_and_keeps_size() {
        let geometry = OverlayGeometry {
            x: 10,
            y: 20,
            width: 400,
            height: 300,
        };
        let merged = geometry.merged_position(-5, 60);
        assert_eq!(merged.x, -5);
        assert_eq!(merged.y, 60);
        assert_eq!(merged.width, 400);
        assert_eq!(merged.height, 300);
    }

    #[test]
    fn merged_size_updates_size_and_keeps_position() {
        let geometry = OverlayGeometry {
            x: 10,
            y: 20,
            width: 400,
            height: 300,
        };
        let merged = geometry.merged_size(800, 600);
        assert_eq!(merged.x, 10);
        assert_eq!(merged.y, 20);
        assert_eq!(merged.width, 800);
        assert_eq!(merged.height, 600);
    }
}
