//! Concrete [`OverlayController`] backed by Tauri window APIs.
//!
//! The overlay window is created once at startup (see `tauri.conf.json`,
//! `visible: false`) and only shown/hidden here - never destroyed.

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize};

use super::{OverlayController, OverlayResult, OVERLAY_VISIBILITY_EVENT};
use crate::config;
use crate::platform;
use crate::state::{
    AppState, MonitorRect, OverlayGeometry, OverlayStatus, MAIN_LABEL, OVERLAY_LABEL,
};

pub struct OverlayManager {
    app: AppHandle,
}

impl OverlayManager {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }

    fn window(&self) -> OverlayResult<tauri::WebviewWindow> {
        self.app
            .get_webview_window(OVERLAY_LABEL)
            .ok_or_else(|| format!("overlay window \"{OVERLAY_LABEL}\" not found"))
    }

    fn state(&self) -> OverlayResult<tauri::State<'_, AppState>> {
        Ok(self.app.state::<AppState>())
    }

    /// Best-effort: a failed emit is logged, never fatal.
    fn emit_visibility(&self, visible: bool) {
        if let Err(e) = self.app.emit_to(
            MAIN_LABEL,
            OVERLAY_VISIBILITY_EVENT,
            OverlayStatus { visible },
        ) {
            eprintln!("[overlay] failed to emit visibility event: {e}");
        }
    }

    /// Monitors with the primary first, which is where a lost overlay is
    /// recovered to.
    fn monitors(window: &tauri::WebviewWindow) -> Vec<MonitorRect> {
        let rect = |monitor: &tauri::Monitor| MonitorRect {
            x: monitor.position().x,
            y: monitor.position().y,
            width: monitor.size().width,
            height: monitor.size().height,
        };
        let primary = window.primary_monitor().ok().flatten().map(|m| rect(&m));
        let mut monitors: Vec<MonitorRect> = window
            .available_monitors()
            .unwrap_or_default()
            .iter()
            .map(rect)
            .collect();
        if let Some(primary) = primary {
            monitors.retain(|m| *m != primary);
            monitors.insert(0, primary);
        }
        monitors
    }

    fn stored_geometry(&self) -> Option<OverlayGeometry> {
        self.state()
            .ok()
            .and_then(|state| state.geometry.lock().ok().map(|guard| *guard))
            .flatten()
    }

    /// Keeps the in-memory geometry current without touching the window or
    /// the disk; move and resize events arrive far too often to write.
    pub fn record_geometry(&self, geometry: OverlayGeometry) {
        if let Ok(state) = self.state() {
            if let Ok(mut guard) = state.geometry.lock() {
                *guard = Some(geometry);
            }
        }
    }

    /// Best-effort: a failed write is logged, never fatal.
    fn persist_geometry(&self, geometry: OverlayGeometry) {
        self.record_geometry(geometry);
        if let Err(e) = config::save_overlay_geometry(&self.app, geometry) {
            eprintln!("[overlay] failed to save geometry: {e}");
        }
    }

    /// Writes whatever geometry is currently held. Call before quitting.
    pub fn flush_geometry(&self) {
        if let Some(geometry) = self.stored_geometry() {
            if let Err(e) = config::save_overlay_geometry(&self.app, geometry) {
                eprintln!("[overlay] failed to save geometry: {e}");
            }
        }
    }

    /// Default size centered on the primary monitor: the way back when the
    /// overlay ends up somewhere the user cannot grab it.
    pub fn reset_geometry(&self) -> OverlayResult<OverlayGeometry> {
        let window = self.window()?;
        let defaults = OverlayGeometry::defaults();
        let target = match Self::monitors(&window).first() {
            Some(primary) => defaults.centered_in(*primary),
            None => defaults,
        };
        self.set_size(target.width, target.height)?;
        self.set_position(target.x, target.y)?;
        Ok(target)
    }

    fn restore_or_capture_geometry(&self, window: &tauri::WebviewWindow) -> OverlayResult<()> {
        match self.stored_geometry() {
            Some(saved) => {
                let target = saved.clamped_to(&Self::monitors(window));
                window
                    .set_size(PhysicalSize::new(target.width, target.height))
                    .map_err(|e| format!("failed to restore overlay size: {e}"))?;
                window
                    .set_position(PhysicalPosition::new(target.x, target.y))
                    .map_err(|e| format!("failed to restore overlay position: {e}"))?;
                self.record_geometry(target);
            }
            None => {
                if let Ok(current) = self.geometry() {
                    self.record_geometry(current);
                }
            }
        }
        Ok(())
    }
}

impl OverlayController for OverlayManager {
    fn show(&self) -> OverlayResult<()> {
        let window = self.window()?;
        self.restore_or_capture_geometry(&window)?;
        window
            .show()
            .map_err(|e| format!("failed to show overlay: {e}"))?;
        // The window is visible from here on, even if a later step fails.
        self.emit_visibility(true);
        platform::after_show(&window)?;
        // Activation is best-effort: on Wayland the compositor may decline
        // focus while still showing the window above the game.
        if let Err(e) = self.focus() {
            eprintln!("[overlay] overlay shown but focus was declined: {e}");
        }
        Ok(())
    }

    fn hide(&self) -> OverlayResult<()> {
        let window = self.window()?;
        // Snapshot geometry before hiding so the next show() restores where
        // the user actually left the window, not a stale position.
        if let Ok(current) = self.geometry() {
            self.persist_geometry(current);
        }
        window
            .hide()
            .map_err(|e| format!("failed to hide overlay: {e}"))?;
        self.emit_visibility(false);
        Ok(())
    }

    fn is_visible(&self) -> OverlayResult<bool> {
        let window = self.window()?;
        window
            .is_visible()
            .map_err(|e| format!("failed to query overlay visibility: {e}"))
    }

    fn set_position(&self, x: i32, y: i32) -> OverlayResult<()> {
        let window = self.window()?;
        window
            .set_position(PhysicalPosition::new(x, y))
            .map_err(|e| format!("failed to move overlay: {e}"))?;
        let current = self
            .stored_geometry()
            .unwrap_or_else(OverlayGeometry::defaults)
            .merged_position(x, y);
        self.persist_geometry(current);
        Ok(())
    }

    fn set_size(&self, width: u32, height: u32) -> OverlayResult<()> {
        let window = self.window()?;
        window
            .set_size(PhysicalSize::new(width, height))
            .map_err(|e| format!("failed to resize overlay: {e}"))?;
        let current = self
            .stored_geometry()
            .unwrap_or_else(OverlayGeometry::defaults)
            .merged_size(width, height);
        self.persist_geometry(current);
        Ok(())
    }

    fn focus(&self) -> OverlayResult<()> {
        let window = self.window()?;
        window
            .set_focus()
            .map_err(|e| format!("failed to focus overlay: {e}"))
    }

    fn geometry(&self) -> OverlayResult<OverlayGeometry> {
        let window = self.window()?;
        let position = window
            .outer_position()
            .map_err(|e| format!("failed to read overlay position: {e}"))?;
        let size = window
            .outer_size()
            .map_err(|e| format!("failed to read overlay size: {e}"))?;
        Ok(OverlayGeometry {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
        })
    }
}
