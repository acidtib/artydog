use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub const OVERLAY_LABEL: &str = "overlay";
pub const OVERLAY_DEFAULT_WIDTH: u32 = 400;
pub const OVERLAY_DEFAULT_HEIGHT: u32 = 300;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum OverlayVisibility {
    Hidden,
    Visible,
}

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
}

#[derive(Debug, Clone, Serialize)]
pub struct HotkeyStatus {
    pub shortcut: String,
    pub registered: bool,
    pub error: Option<String>,
}

pub struct AppState {
    pub visibility: Mutex<OverlayVisibility>,
    pub geometry: Mutex<Option<OverlayGeometry>>,
    pub hotkey_error: Mutex<Option<String>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            visibility: Mutex::new(OverlayVisibility::Hidden),
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
