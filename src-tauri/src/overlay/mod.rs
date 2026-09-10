//! Overlay abstraction.
//!
//! All overlay behavior goes through [`OverlayController`] so that
//! Windows/Linux specifics stay behind the platform boundary instead of
//! leaking into commands, the hotkey handler, or the frontend.

use crate::state::OverlayGeometry;

pub mod manager;

pub use manager::OverlayManager;

pub type OverlayResult<T> = Result<T, String>;

pub trait OverlayController {
    fn show(&self) -> OverlayResult<()>;
    fn hide(&self) -> OverlayResult<()>;
    fn toggle(&self) -> OverlayResult<()>;
    fn is_visible(&self) -> OverlayResult<bool>;
    fn set_position(&self, x: i32, y: i32) -> OverlayResult<()>;
    fn set_size(&self, width: u32, height: u32) -> OverlayResult<()>;
    fn focus(&self) -> OverlayResult<()>;
    fn geometry(&self) -> OverlayResult<OverlayGeometry>;
}
