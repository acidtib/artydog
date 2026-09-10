//! System tray icon: keeps Potato alive while the main window is hidden.
//!
//! Closing (or minimizing) the main window hides it to the tray instead of
//! quitting, so the global `M` shortcut keeps working while gaming. The
//! tray menu is the only way to quit once the window is hidden.

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    App, AppHandle, Manager,
};

use crate::overlay::{OverlayController, OverlayManager};
use crate::state::MAIN_LABEL;

const MENU_SHOW: &str = "show-hide";
const MENU_TOGGLE_OVERLAY: &str = "toggle-overlay";
const MENU_QUIT: &str = "quit";

fn main_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window(MAIN_LABEL)
        .ok_or_else(|| format!("main window \"{MAIN_LABEL}\" not found"))
}

/// Surface the main window from any state: hidden in the tray or minimized.
pub fn show_main(app: &AppHandle) {
    match main_window(app) {
        Ok(window) => {
            // Restore first so a tray-minimized window does not come back
            // as a minimized ghost.
            let _ = window.unminimize();
            let result = window.show().and_then(|_| window.set_focus());
            if let Err(e) = result {
                eprintln!("[tray] failed to show main window: {e}");
            }
        }
        Err(e) => eprintln!("[tray] {e}"),
    }
}

pub fn toggle_main(app: &AppHandle) {
    match main_window(app) {
        Ok(window) => {
            if window.is_visible().unwrap_or(false) {
                if let Err(e) = window.hide() {
                    eprintln!("[tray] failed to hide main window: {e}");
                }
            } else {
                show_main(app);
            }
        }
        Err(e) => eprintln!("[tray] {e}"),
    }
}

fn toggle_overlay(app: &AppHandle) {
    if let Err(e) = OverlayManager::new(app.clone()).toggle() {
        eprintln!("[tray] overlay toggle failed: {e}");
    }
}

fn tray_icon(app: &App) -> Result<tauri::image::Image<'_>, String> {
    app.default_window_icon()
        .cloned()
        .ok_or_else(|| "no default window icon available for tray".to_string())
}

pub fn build_tray(app: &App) -> Result<(), String> {
    let menu = MenuBuilder::new(app)
        .items(&[
            &MenuItemBuilder::with_id(MENU_SHOW, "Show / Hide")
                .build(app)
                .map_err(|e| format!("failed to build tray menu: {e}"))?,
            &MenuItemBuilder::with_id(MENU_TOGGLE_OVERLAY, "Toggle Overlay")
                .build(app)
                .map_err(|e| format!("failed to build tray menu: {e}"))?,
            &MenuItemBuilder::with_id(MENU_QUIT, "Quit")
                .build(app)
                .map_err(|e| format!("failed to build tray menu: {e}"))?,
        ])
        .build()
        .map_err(|e| format!("failed to build tray menu: {e}"))?;

    tauri::tray::TrayIconBuilder::new()
        .icon(tray_icon(app)?)
        .tooltip("Potato")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_SHOW => toggle_main(app),
            MENU_TOGGLE_OVERLAY => toggle_overlay(app),
            MENU_QUIT => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main(tray.app_handle());
            }
        })
        .build(app)
        .map_err(|e| format!("failed to build tray icon: {e}"))?;
    Ok(())
}
