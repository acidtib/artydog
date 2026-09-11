//! Windows-specific overlay behavior.
//!
//! The global toggle is a low-level keyboard hook rather than
//! `RegisterHotKey`, because a registered hotkey is exclusive: Windows routes
//! the key to the registering window and the foreground app never sees it.
//! WARDOGS binds `M` to its map, so the key has to be observed and passed on.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;

use tauri::AppHandle;
use windows_sys::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows_sys::Win32::UI::Input::KeyboardAndMouse::VK_M;
use windows_sys::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, SetWindowsHookExW, HHOOK, KBDLLHOOKSTRUCT, LLKHF_INJECTED, WH_KEYBOARD_LL,
    WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

use crate::overlay::OverlayResult;

/// The hook callback takes no state, so the handle it needs lives here.
static APP: OnceLock<AppHandle> = OnceLock::new();
/// Holding the key repeats the down event; the toggle wants the edge only.
static KEY_DOWN: AtomicBool = AtomicBool::new(false);
static INSTALLED: AtomicBool = AtomicBool::new(false);

pub fn name() -> &'static str {
    "windows"
}

pub fn after_show(_window: &tauri::WebviewWindow) -> OverlayResult<()> {
    Ok(())
}

/// Windows drops a hook that takes too long, so the toggle is handed to the
/// main thread instead of running inside the callback.
fn queue_toggle() {
    let Some(app) = APP.get() else {
        return;
    };
    let handle = app.clone();
    if let Err(e) = app.run_on_main_thread(move || crate::hotkey::handle_hotkey(&handle)) {
        eprintln!("[hotkey] failed to queue overlay toggle: {e}");
    }
}

unsafe extern "system" fn keyboard_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        let event = unsafe { &*(lparam as *const KBDLLHOOKSTRUCT) };
        // Ignore synthetic keys: only a real press should toggle.
        if event.vkCode == VK_M as u32 && event.flags & LLKHF_INJECTED == 0 {
            match wparam as u32 {
                WM_KEYDOWN | WM_SYSKEYDOWN => {
                    if !KEY_DOWN.swap(true, Ordering::SeqCst) {
                        queue_toggle();
                    }
                }
                WM_KEYUP | WM_SYSKEYUP => KEY_DOWN.store(false, Ordering::SeqCst),
                _ => {}
            }
        }
    }
    // Always pass the key on. Swallowing it is the bug this hook exists to fix.
    unsafe { CallNextHookEx(std::ptr::null_mut::<std::ffi::c_void>() as HHOOK, code, wparam, lparam) }
}

/// Installs the toggle hook. The callback is delivered to the thread that
/// installed it, so this has to run on the main thread, which pumps messages.
pub fn install_toggle_hook(app: &AppHandle) -> Result<bool, String> {
    if INSTALLED.load(Ordering::SeqCst) {
        return Ok(true);
    }
    let _ = APP.set(app.clone());
    let hook: HHOOK = unsafe {
        SetWindowsHookExW(
            WH_KEYBOARD_LL,
            Some(keyboard_hook),
            std::ptr::null_mut(),
            0,
        )
    };
    if hook.is_null() {
        return Err("failed to install the keyboard hook".to_string());
    }
    INSTALLED.store(true, Ordering::SeqCst);
    Ok(true)
}

pub fn toggle_hook_installed() -> bool {
    INSTALLED.load(Ordering::SeqCst)
}
