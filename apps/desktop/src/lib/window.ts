import { getCurrentWindow } from "@tauri-apps/api/window";

/// Straight to the tray: minimize() would depend on a Resized event that
/// KWin does not reliably send, leaving the window on the taskbar instead.
export async function hideToTray(): Promise<void> {
  await getCurrentWindow().hide();
}

export async function closeWindow(): Promise<void> {
  await getCurrentWindow().close();
}
