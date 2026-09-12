//! System tray icon: keeps ArtyDog alive while the main window is hidden.
//!
//! Closing (or minimizing) the main window hides it to the tray instead of
//! quitting, so the global `M` shortcut keeps working while gaming. The
//! tray menu is the only way to quit once the window is hidden.

use std::time::{Duration, Instant};

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    App, AppHandle, Manager,
};

use crate::overlay::{OverlayController, OverlayManager};
use crate::state::{AppState, MAIN_LABEL};

/// Only Windows sends its own DoubleClick, so elsewhere two quick clicks count as one.
const DOUBLE_CLICK: Duration = Duration::from_millis(500);

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

#[derive(Debug, PartialEq, Eq)]
enum TrayAction {
    Show,
    Hide,
}

/// A window hidden while still flagged minimized keeps reporting itself
/// visible, so the decision has to ask both questions.
fn toggle_action(visible: bool, minimized: bool) -> TrayAction {
    if visible && !minimized {
        TrayAction::Hide
    } else {
        TrayAction::Show
    }
}

pub fn toggle_main(app: &AppHandle) {
    match main_window(app) {
        Ok(window) => {
            let visible = window.is_visible().unwrap_or(false);
            let minimized = window.is_minimized().unwrap_or(false);
            match toggle_action(visible, minimized) {
                TrayAction::Hide => {
                    if let Err(e) = window.hide() {
                        eprintln!("[tray] failed to hide main window: {e}");
                    }
                }
                TrayAction::Show => show_main(app),
            }
        }
        Err(e) => eprintln!("[tray] {e}"),
    }
}

#[derive(Debug, PartialEq, Eq)]
enum ClickAction {
    Toggle,
    Show,
}

/// The first click of a double click already toggled, so the second shows.
fn click_action(since_previous: Option<Duration>) -> ClickAction {
    match since_previous {
        Some(gap) if gap <= DOUBLE_CLICK => ClickAction::Show,
        _ => ClickAction::Toggle,
    }
}

/// Records this click and reports the gap since the one before it.
fn since_previous_click(app: &AppHandle, now: Instant) -> Option<Duration> {
    let state = app.state::<AppState>();
    let mut last = state.last_tray_click.lock().ok()?;
    let gap = last.map(|previous| now.duration_since(previous));
    *last = Some(now);

    gap
}

fn on_left_click(app: &AppHandle) {
    match click_action(since_previous_click(app, Instant::now())) {
        ClickAction::Show => show_main(app),
        ClickAction::Toggle => toggle_main(app),
    }
}

fn toggle_overlay(app: &AppHandle) {
    if let Err(e) = OverlayManager::new(app.clone()).toggle() {
        eprintln!("[tray] overlay toggle failed: {e}");
    }
}

/// The overlay's live geometry only reaches disk on hide, so save it before
/// the process goes away with the overlay still open.
fn quit(app: &AppHandle) {
    OverlayManager::new(app.clone()).flush_geometry();
    app.exit(0);
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
        .tooltip("ArtyDog")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_SHOW => toggle_main(app),
            MENU_TOGGLE_OVERLAY => toggle_overlay(app),
            MENU_QUIT => quit(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } => on_left_click(tray.app_handle()),
            // Windows only; arrives after both clicks, and showing is idempotent.
            TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => show_main(tray.app_handle()),
            _ => {}
        })
        .build(app)
        .map_err(|e| format!("failed to build tray icon: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{click_action, toggle_action, ClickAction, Duration, TrayAction};

    #[test]
    fn shows_a_window_hidden_in_the_tray() {
        assert_eq!(toggle_action(false, false), TrayAction::Show);
    }

    #[test]
    fn hides_a_window_on_screen() {
        assert_eq!(toggle_action(true, false), TrayAction::Hide);
    }

    /// GTK reports a window trayed by minimizing as still visible.
    #[test]
    fn shows_a_window_trayed_by_minimizing() {
        assert_eq!(toggle_action(true, true), TrayAction::Show);
        assert_eq!(toggle_action(false, true), TrayAction::Show);
    }

    #[test]
    fn a_lone_click_toggles() {
        assert_eq!(click_action(None), ClickAction::Toggle);
    }

    #[test]
    fn a_quick_second_click_shows_rather_than_toggling_back() {
        assert_eq!(
            click_action(Some(Duration::from_millis(120))),
            ClickAction::Show
        );
    }

    /// Two deliberate clicks are two toggles, not a double click.
    #[test]
    fn a_slow_second_click_still_toggles() {
        assert_eq!(
            click_action(Some(Duration::from_millis(900))),
            ClickAction::Toggle
        );
    }
}
