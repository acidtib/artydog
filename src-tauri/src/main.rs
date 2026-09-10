// Hide the console window on Windows release builds. Debug builds keep it
// so setup/hotkey eprintln logs stay visible during development.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    potato_lib::run();
}
