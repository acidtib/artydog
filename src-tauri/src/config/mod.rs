//! Settings that outlive the process.
//!
//! Versioned from the start so a later release can migrate an old file
//! instead of guessing at its shape.

mod persistence;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::state::OverlayGeometry;

pub const FILE_NAME: &str = "config.json";
pub const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub schema_version: u32,
    /// Absent until the overlay has been placed at least once.
    #[serde(default)]
    pub overlay: Option<OverlayGeometry>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            overlay: None,
        }
    }
}

pub fn overlay_geometry(app: &AppHandle) -> Option<OverlayGeometry> {
    persistence::load(app).overlay
}

/// Writes `geometry` into the stored config, leaving other settings intact.
pub fn save_overlay_geometry(app: &AppHandle, geometry: OverlayGeometry) -> Result<(), String> {
    let config = Config {
        overlay: Some(geometry),
        ..persistence::load(app)
    };
    persistence::save(app, config)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_carry_the_current_schema_version() {
        let config = Config::default();
        assert_eq!(config.schema_version, SCHEMA_VERSION);
        assert!(config.overlay.is_none());
    }

    #[test]
    fn overlay_geometry_round_trips_through_json() {
        let config = Config {
            schema_version: SCHEMA_VERSION,
            overlay: Some(OverlayGeometry {
                x: -1200,
                y: 40,
                width: 420,
                height: 520,
            }),
        };
        let raw = serde_json::to_string(&config).unwrap();
        let parsed: Config = serde_json::from_str(&raw).unwrap();
        assert_eq!(parsed.overlay, config.overlay);
    }

    #[test]
    fn schema_version_is_camel_case_on_disk() {
        let raw = serde_json::to_string(&Config::default()).unwrap();
        assert!(raw.contains("\"schemaVersion\""), "unexpected json: {raw}");
    }

    #[test]
    fn a_file_without_an_overlay_key_still_parses() {
        let parsed: Config = serde_json::from_str(r#"{"schemaVersion":1}"#).unwrap();
        assert!(parsed.overlay.is_none());
    }
}
