mod commands;
mod config;
mod hotkey;
mod overlay;
mod platform;
mod state;
mod tray;

use tauri::{Manager, WindowEvent};
use tauri_plugin_global_shortcut::ShortcutState;

use overlay::{OverlayController, OverlayManager};
use state::{AppState, OVERLAY_LABEL};

/// The main window lives in the tray: closing or minimizing it hides it
/// instead of quitting. Quit via the tray menu.
fn main_window_event(window: &tauri::Window, event: &WindowEvent) {
    match event {
        WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            if let Err(e) = window.hide() {
                eprintln!("[window] failed to hide main window: {e}");
            }
        }
        WindowEvent::Resized(_) => {
            if window.is_minimized().unwrap_or(false) {
                if let Err(e) = window.hide() {
                    eprintln!("[window] failed to tray minimized window: {e}");
                }
            }
        }
        _ => {}
    }
}

/// Follows the user dragging or resizing the overlay. Geometry reported while
/// it is hidden comes from the window manager, not the user, so ignore it.
fn overlay_window_event(window: &tauri::Window, event: &WindowEvent) {
    if !matches!(event, WindowEvent::Moved(_) | WindowEvent::Resized(_))
        || !window.is_visible().unwrap_or(false)
    {
        return;
    }
    let manager = OverlayManager::new(window.app_handle().clone());
    if let Ok(geometry) = manager.geometry() {
        manager.record_geometry(geometry);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must stay the first plugin: a second launch has to bail out here,
        // before any window or tray icon is created.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            tray::show_main(app);
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        hotkey::handle_hotkey(app);
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::new())
        .on_window_event(|window, event| match window.label() {
            state::MAIN_LABEL => main_window_event(window, event),
            state::OVERLAY_LABEL => overlay_window_event(window, event),
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::show_overlay,
            commands::hide_overlay,
            commands::toggle_overlay,
            commands::get_overlay_state,
            commands::get_overlay_geometry,
            commands::set_overlay_position,
            commands::set_overlay_size,
            commands::reset_overlay_geometry,
            commands::get_hotkey_status,
        ])
        .setup(|app| {
            eprintln!(
                "[setup] ArtyDog starting (platform: {})",
                platform::name()
            );
            let handle = app.handle().clone();

            // Geometry saved by an earlier run. It is clamped to the monitors
            // that actually exist when the overlay is next shown.
            if let Some(saved) = config::overlay_geometry(&handle) {
                let state = handle.state::<AppState>();
                let app_state: &AppState = &state;
                let _ = app_state.geometry.lock().map(|mut guard| {
                    *guard = Some(saved);
                });
            }
            // The overlay window is declared hidden in tauri.conf.json; make
            // sure it really starts hidden so the first `M` press shows it.
            if let Some(overlay) = app.get_webview_window(OVERLAY_LABEL) {
                if let Err(e) = overlay.hide() {
                    eprintln!("[setup] failed to hide overlay at startup: {e}");
                }
            } else {
                eprintln!("[setup] overlay window \"{OVERLAY_LABEL}\" not found");
            }

            // Register the global toggle. A failure must be visible, never
            // silent: record it in state (surfaced via get_hotkey_status)
            // and log it.
            if let Err(e) = tray::build_tray(app) {
                eprintln!("[setup] {e}");
            }

            if let Err(e) = hotkey::register_toggle_shortcut(&handle) {
                eprintln!("[setup] {e}");
                let state = handle.state::<AppState>();
                let app_state: &AppState = &state;
                let _ = app_state.hotkey_error.lock().map(|mut guard| {
                    *guard = Some(e);
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("[fatal] failed to start ArtyDog: {e}");
            std::process::exit(1);
        });
}
