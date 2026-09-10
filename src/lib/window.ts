import { getCurrentWindow } from "@tauri-apps/api/window";

/// The overlay is undecorated, so it has no native resize border: the corner
/// grip has to ask the window manager for one.
export async function startOverlayResize(): Promise<void> {
  await getCurrentWindow().startResizeDragging("SouthEast");
}
