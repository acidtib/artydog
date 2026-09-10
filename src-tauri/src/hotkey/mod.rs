//! Global hotkey handling (`M` toggles the overlay).

pub mod manager;

pub use manager::{handle_hotkey, register_toggle_shortcut, TOGGLE_SHORTCUT_LABEL};
