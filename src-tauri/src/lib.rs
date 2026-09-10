mod commands;
mod hotkey;
mod overlay;
mod platform;
mod state;
mod tray;

use tauri::{Manager, WindowEvent};
use tauri_plugin_global_shortcut::ShortcutState;

use state::{AppState, OVERLAY_LABEL};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        hotkey::handle_hotkey(app);
                    }
                })
                .build(),
        )
        .manage(AppState::new())
        .on_window_event(|window, event| {
            // The main window lives in the tray: closing or minimizing it
            // hides it instead of quitting. Quit via the tray menu.
            if window.label() != state::MAIN_LABEL {
                return;
            }
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
        })
        .invoke_handler(tauri::generate_handler![
            commands::show_overlay,
            commands::hide_overlay,
            commands::toggle_overlay,
            commands::get_overlay_state,
            commands::get_overlay_geometry,
            commands::set_overlay_position,
            commands::set_overlay_size,
            commands::get_hotkey_status,
        ])
        .setup(|app| {
            eprintln!(
                "[setup] Potato starting (platform: {})",
                platform::name()
            );
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

            let handle = app.handle().clone();
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
            eprintln!("[fatal] failed to start Potato: {e}");
            std::process::exit(1);
        });
}
