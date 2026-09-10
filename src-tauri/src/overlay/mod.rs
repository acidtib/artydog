//! Overlay abstraction.
//!
//! All overlay behavior goes through [`OverlayController`] so that
//! Windows/Linux specifics stay behind the platform boundary instead of
//! leaking into commands, the hotkey handler, or the frontend.

use crate::state::OverlayGeometry;

pub mod manager;

pub use manager::OverlayManager;

pub type OverlayResult<T> = Result<T, String>;

/// Emitted to the main window on overlay visibility changes; the name is
/// mirrored by `OVERLAY_VISIBILITY_EVENT` in `src/lib/overlay.ts`.
pub const OVERLAY_VISIBILITY_EVENT: &str = "overlay-visibility";

pub trait OverlayController {
    fn show(&self) -> OverlayResult<()>;
    fn hide(&self) -> OverlayResult<()>;

    /// The toggle decision is controller-independent: hide when visible,
    /// show when hidden.
    fn toggle(&self) -> OverlayResult<()> {
        if self.is_visible()? {
            self.hide()
        } else {
            self.show()
        }
    }

    fn is_visible(&self) -> OverlayResult<bool>;
    fn set_position(&self, x: i32, y: i32) -> OverlayResult<()>;
    fn set_size(&self, width: u32, height: u32) -> OverlayResult<()>;
    fn focus(&self) -> OverlayResult<()>;
    fn geometry(&self) -> OverlayResult<OverlayGeometry>;
}

#[cfg(test)]
mod tests {
    use std::cell::Cell;

    use super::*;

    /// Records what the toggle decision asks the controller to do.
    struct FakeOverlay {
        visible: Cell<bool>,
        shown: Cell<usize>,
        hidden: Cell<usize>,
    }

    impl FakeOverlay {
        fn new(visible: bool) -> Self {
            Self {
                visible: Cell::new(visible),
                shown: Cell::new(0),
                hidden: Cell::new(0),
            }
        }
    }

    impl OverlayController for FakeOverlay {
        fn show(&self) -> OverlayResult<()> {
            self.shown.set(self.shown.get() + 1);
            self.visible.set(true);
            Ok(())
        }

        fn hide(&self) -> OverlayResult<()> {
            self.hidden.set(self.hidden.get() + 1);
            self.visible.set(false);
            Ok(())
        }

        fn is_visible(&self) -> OverlayResult<bool> {
            Ok(self.visible.get())
        }

        fn set_position(&self, _x: i32, _y: i32) -> OverlayResult<()> {
            Ok(())
        }

        fn set_size(&self, _width: u32, _height: u32) -> OverlayResult<()> {
            Ok(())
        }

        fn focus(&self) -> OverlayResult<()> {
            Ok(())
        }

        fn geometry(&self) -> OverlayResult<OverlayGeometry> {
            Ok(OverlayGeometry::defaults())
        }
    }

    #[test]
    fn toggle_shows_when_hidden() {
        let overlay = FakeOverlay::new(false);
        overlay.toggle().unwrap();
        assert_eq!(overlay.shown.get(), 1);
        assert_eq!(overlay.hidden.get(), 0);
        assert!(overlay.visible.get());
    }

    #[test]
    fn toggle_hides_when_visible() {
        let overlay = FakeOverlay::new(true);
        overlay.toggle().unwrap();
        assert_eq!(overlay.hidden.get(), 1);
        assert_eq!(overlay.shown.get(), 0);
        assert!(!overlay.visible.get());
    }
}
