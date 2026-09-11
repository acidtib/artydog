//! Config file IO. Every read failure falls back to defaults: a corrupt file
//! must not stop the app from starting.

use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use super::{Config, FILE_NAME, SCHEMA_VERSION};

fn path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|dir| dir.join(FILE_NAME))
        .map_err(|e| format!("no app config directory: {e}"))
}

pub fn load(app: &AppHandle) -> Config {
    let path = match path(app) {
        Ok(path) => path,
        Err(e) => {
            eprintln!("[config] {e}");
            return Config::default();
        }
    };
    let Ok(raw) = fs::read_to_string(&path) else {
        return Config::default();
    };
    match serde_json::from_str::<Config>(&raw) {
        Ok(config) if config.schema_version == SCHEMA_VERSION => config,
        Ok(config) => {
            eprintln!(
                "[config] ignoring {}: schema version {} is not {SCHEMA_VERSION}",
                path.display(),
                config.schema_version
            );
            Config::default()
        }
        Err(e) => {
            eprintln!("[config] ignoring unreadable {}: {e}", path.display());
            Config::default()
        }
    }
}

pub fn save(app: &AppHandle, config: Config) -> Result<(), String> {
    let path = path(app)?;
    let dir = path
        .parent()
        .ok_or_else(|| format!("{} has no parent directory", path.display()))?;
    fs::create_dir_all(dir).map_err(|e| format!("failed to create {}: {e}", dir.display()))?;
    let raw =
        serde_json::to_string_pretty(&config).map_err(|e| format!("failed to serialize: {e}"))?;
    fs::write(&path, raw).map_err(|e| format!("failed to write {}: {e}", path.display()))
}
