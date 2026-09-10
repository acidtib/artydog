//! Platform boundary for overlay behavior.
//!
//! Shared code must only call the functions exposed here. Anything that
//! needs a native OS API (beyond what Tauri provides) lands in `windows.rs`
//! or `linux.rs`, never in the overlay manager, commands, or hotkey code.

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "linux")]
pub use linux::*;

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
mod fallback;

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
pub use fallback::*;
