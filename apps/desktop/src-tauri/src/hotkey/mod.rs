//! Global hotkey handling for the overlay toggle.

pub mod manager;

pub use manager::{current_hotkey, handle_hotkey, register_saved_hotkey, set_hotkey};
