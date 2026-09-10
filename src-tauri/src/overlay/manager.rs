//! Concrete [`OverlayController`] backed by Tauri window APIs.
//!
//! The overlay window is created once at startup (see `tauri.conf.json`,
//! `visible: false`) and only shown/hidden here — never destroyed.

use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};

use super::{OverlayController, OverlayResult};
use crate::platform;
use crate::state::{AppState, OverlayGeometry, OverlayVisibility, OVERLAY_LABEL};

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

    fn mirror_visibility(&self, visibility: OverlayVisibility) {
        if let Ok(state) = self.state() {
            if let Ok(mut guard) = state.visibility.lock() {
                *guard = visibility;
            }
        }
    }

    fn restore_or_capture_geometry(&self, window: &tauri::WebviewWindow) -> OverlayResult<()> {
        let stored = self
            .state()
            .and_then(|state| {
                state
                    .geometry
                    .lock()
                    .map_err(|e| format!("overlay geometry lock poisoned: {e}"))
                    .map(|guard| *guard)
            })
            .unwrap_or(None);
        match stored {
            Some(saved) => {
                window
                    .set_size(PhysicalSize::new(saved.width, saved.height))
                    .map_err(|e| format!("failed to restore overlay size: {e}"))?;
                window
                    .set_position(PhysicalPosition::new(saved.x, saved.y))
                    .map_err(|e| format!("failed to restore overlay position: {e}"))?;
            }
            None => {
                if let Ok(current) = self.geometry() {
                    if let Ok(state) = self.state() {
                        if let Ok(mut guard) = state.geometry.lock() {
                            *guard = Some(current);
                        }
                    }
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
        platform::after_show(&window)?;
        // Activation is best-effort: on Wayland the compositor may decline
        // focus while still showing the window above the game.
        if let Err(e) = self.focus() {
            eprintln!("[overlay] overlay shown but focus was declined: {e}");
        }
        self.mirror_visibility(OverlayVisibility::Visible);
        Ok(())
    }

    fn hide(&self) -> OverlayResult<()> {
        let window = self.window()?;
        window
            .hide()
            .map_err(|e| format!("failed to hide overlay: {e}"))?;
        self.mirror_visibility(OverlayVisibility::Hidden);
        Ok(())
    }

    fn toggle(&self) -> OverlayResult<()> {
        if self.is_visible()? {
            self.hide()
        } else {
            self.show()
        }
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
        if let Ok(state) = self.state() {
            if let Ok(mut guard) = state.geometry.lock() {
                let mut current = guard.unwrap_or_else(OverlayGeometry::defaults);
                current.x = x;
                current.y = y;
                *guard = Some(current);
            }
        }
        Ok(())
    }

    fn set_size(&self, width: u32, height: u32) -> OverlayResult<()> {
        let window = self.window()?;
        window
            .set_size(PhysicalSize::new(width, height))
            .map_err(|e| format!("failed to resize overlay: {e}"))?;
        if let Ok(state) = self.state() {
            if let Ok(mut guard) = state.geometry.lock() {
                let mut current = guard.unwrap_or_else(OverlayGeometry::defaults);
                current.width = width;
                current.height = height;
                *guard = Some(current);
            }
        }
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
