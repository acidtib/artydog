use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub const OVERLAY_LABEL: &str = "overlay";
pub const MAIN_LABEL: &str = "main";
pub const OVERLAY_DEFAULT_WIDTH: u32 = 400;
pub const OVERLAY_DEFAULT_HEIGHT: u32 = 520;
pub const OVERLAY_MIN_WIDTH: u32 = 280;
pub const OVERLAY_MIN_HEIGHT: u32 = 200;

/// WARDOGS binds bare `M` to its map, and a registered shortcut is exclusive:
/// the game would never see the key again. The modifier keeps them apart.
pub const DEFAULT_HOTKEY: &str = "Alt+M";

/// How much of the overlay has to stay on a monitor to count as reachable.
/// The overlay is undecorated, so an off-screen one cannot be dragged back.
const MIN_VISIBLE: i64 = 48;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct OverlayStatus {
    pub visible: bool,
}

/// A monitor's work area in the same physical coordinate space as
/// [`OverlayGeometry`]. Origins can be negative on multi-monitor setups.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MonitorRect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl MonitorRect {
    fn right(self) -> i64 {
        i64::from(self.x) + i64::from(self.width)
    }

    fn bottom(self) -> i64 {
        i64::from(self.y) + i64::from(self.height)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

    fn right(self) -> i64 {
        i64::from(self.x) + i64::from(self.width)
    }

    fn bottom(self) -> i64 {
        i64::from(self.y) + i64::from(self.height)
    }

    fn reachable_on(self, monitor: MonitorRect) -> bool {
        let overlap_x = self.right().min(monitor.right()) - i64::from(self.x.max(monitor.x));
        let overlap_y = self.bottom().min(monitor.bottom()) - i64::from(self.y.max(monitor.y));
        overlap_x >= MIN_VISIBLE && overlap_y >= MIN_VISIBLE
    }

    pub fn centered_in(self, monitor: MonitorRect) -> Self {
        Self {
            x: monitor.x + (monitor.width as i32 - self.width as i32) / 2,
            y: monitor.y + (monitor.height as i32 - self.height as i32) / 2,
            ..self
        }
    }

    /// Size held between the minimum and the largest monitor, so a size saved
    /// on a big screen still fits a smaller one.
    fn fitted(self, monitors: &[MonitorRect]) -> Self {
        let widest = monitors.iter().map(|m| m.width).max().unwrap_or(u32::MAX);
        let tallest = monitors.iter().map(|m| m.height).max().unwrap_or(u32::MAX);
        Self {
            width: self
                .width
                .clamp(OVERLAY_MIN_WIDTH, widest.max(OVERLAY_MIN_WIDTH)),
            height: self
                .height
                .clamp(OVERLAY_MIN_HEIGHT, tallest.max(OVERLAY_MIN_HEIGHT)),
            ..self
        }
    }

    /// Geometry the user can still reach. Recovery centers on the first
    /// monitor, so callers pass the primary one first.
    pub fn clamped_to(self, monitors: &[MonitorRect]) -> Self {
        let fitted = self.fitted(monitors);
        match monitors.first() {
            Some(primary) if !monitors.iter().any(|m| fitted.reachable_on(*m)) => {
                fitted.centered_in(*primary)
            }
            _ => fitted,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct HotkeyStatus {
    pub shortcut: String,
    pub registered: bool,
    pub error: Option<String>,
}

/// Raw calculator inputs shared by both windows. Text, not parsed values:
/// each window derives errors and the solution locally, so nothing
/// derived has to be kept in sync.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalcState {
    pub weapon_id: String,
    pub mortar_x: String,
    pub mortar_y: String,
    pub target_x: String,
    pub target_y: String,
}

impl Default for CalcState {
    fn default() -> Self {
        Self {
            weapon_id: String::new(),
            mortar_x: String::new(),
            mortar_y: String::new(),
            target_x: String::new(),
            target_y: String::new(),
        }
    }
}

pub struct AppState {
    pub geometry: Mutex<Option<OverlayGeometry>>,
    /// The shortcut the user configured, registered or not.
    pub hotkey: Mutex<String>,
    pub hotkey_error: Mutex<Option<String>>,
    pub calc: Mutex<CalcState>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            geometry: Mutex::new(None),
            hotkey: Mutex::new(DEFAULT_HOTKEY.to_string()),
            hotkey_error: Mutex::new(None),
            calc: Mutex::new(CalcState::default()),
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

    const PRIMARY: MonitorRect = MonitorRect {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    };

    /// A second monitor to the left, which is where negative origins come from.
    const LEFT: MonitorRect = MonitorRect {
        x: -1280,
        y: 0,
        width: 1280,
        height: 1024,
    };

    fn geometry(x: i32, y: i32) -> OverlayGeometry {
        OverlayGeometry {
            x,
            y,
            width: 400,
            height: 300,
        }
    }

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

    #[test]
    fn clamp_keeps_geometry_that_sits_on_a_monitor() {
        let saved = geometry(1400, 800);
        assert_eq!(saved.clamped_to(&[PRIMARY]), saved);
    }

    #[test]
    fn clamp_keeps_geometry_on_a_monitor_with_a_negative_origin() {
        let saved = geometry(-900, 100);
        assert_eq!(saved.clamped_to(&[PRIMARY, LEFT]), saved);
    }

    #[test]
    fn clamp_recenters_when_the_saved_monitor_is_gone() {
        let saved = geometry(-900, 100);
        let recovered = saved.clamped_to(&[PRIMARY]);
        assert_eq!(recovered, geometry(760, 390));
    }

    #[test]
    fn clamp_recenters_geometry_hanging_off_the_edge() {
        // Only 20px wide sliver left on screen, below MIN_VISIBLE.
        let saved = geometry(1900, 400);
        assert_eq!(saved.clamped_to(&[PRIMARY]), geometry(760, 390));
    }

    #[test]
    fn clamp_enforces_the_minimum_size() {
        let saved = OverlayGeometry {
            x: 100,
            y: 100,
            width: 40,
            height: 10,
        };
        let clamped = saved.clamped_to(&[PRIMARY]);
        assert_eq!(clamped.width, OVERLAY_MIN_WIDTH);
        assert_eq!(clamped.height, OVERLAY_MIN_HEIGHT);
    }

    #[test]
    fn clamp_caps_size_to_the_largest_monitor() {
        let saved = OverlayGeometry {
            x: 0,
            y: 0,
            width: 4000,
            height: 3000,
        };
        let clamped = saved.clamped_to(&[LEFT]);
        assert_eq!(clamped.width, LEFT.width);
        assert_eq!(clamped.height, LEFT.height);
    }

    #[test]
    fn clamp_without_monitors_only_enforces_the_minimum_size() {
        let saved = OverlayGeometry {
            x: 5000,
            y: 5000,
            width: 40,
            height: 10,
        };
        let clamped = saved.clamped_to(&[]);
        assert_eq!(clamped.x, 5000);
        assert_eq!(clamped.y, 5000);
        assert_eq!(clamped.width, OVERLAY_MIN_WIDTH);
        assert_eq!(clamped.height, OVERLAY_MIN_HEIGHT);
    }

    #[test]
    fn centered_in_uses_the_monitor_origin() {
        let centered = geometry(0, 0).centered_in(LEFT);
        assert_eq!(centered.x, -1280 + (1280 - 400) / 2);
        assert_eq!(centered.y, (1024 - 300) / 2);
    }

    #[test]
    fn calc_state_default_is_all_empty() {
        let calc = CalcState::default();
        assert_eq!(calc.weapon_id, "");
        assert_eq!(calc.mortar_x, "");
        assert_eq!(calc.mortar_y, "");
        assert_eq!(calc.target_x, "");
        assert_eq!(calc.target_y, "");
    }

    #[test]
    fn calc_state_serializes_camel_case_for_the_frontend_contract() {
        let calc = CalcState {
            weapon_id: "mortar".to_string(),
            mortar_x: "50".to_string(),
            mortar_y: "50".to_string(),
            target_x: "53".to_string(),
            target_y: "54".to_string(),
        };

        let json = serde_json::to_string(&calc).unwrap();
        assert_eq!(
            json,
            r#"{"weaponId":"mortar","mortarX":"50","mortarY":"50","targetX":"53","targetY":"54"}"#
        );

        let back: CalcState = serde_json::from_str(&json).unwrap();
        assert_eq!(back, calc);
    }
}
