import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/// Must match OVERLAY_VISIBILITY_EVENT in src-tauri/src/overlay/mod.rs.
export const OVERLAY_VISIBILITY_EVENT = "overlay-visibility";

export interface OverlayStatus {
  visible: boolean;
}

export interface OverlayGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HotkeyStatus {
  shortcut: string;
  registered: boolean;
  error: string | null;
}

export async function showOverlay(): Promise<OverlayStatus> {
  return invoke<OverlayStatus>("show_overlay");
}

export async function hideOverlay(): Promise<OverlayStatus> {
  return invoke<OverlayStatus>("hide_overlay");
}

export async function toggleOverlay(): Promise<OverlayStatus> {
  return invoke<OverlayStatus>("toggle_overlay");
}

export async function getOverlayState(): Promise<OverlayStatus> {
  return invoke<OverlayStatus>("get_overlay_state");
}

export async function getOverlayGeometry(): Promise<OverlayGeometry> {
  return invoke<OverlayGeometry>("get_overlay_geometry");
}

export async function setOverlayPosition(
  x: number,
  y: number,
): Promise<OverlayGeometry> {
  return invoke<OverlayGeometry>("set_overlay_position", { x, y });
}

export async function setOverlaySize(
  width: number,
  height: number,
): Promise<OverlayGeometry> {
  return invoke<OverlayGeometry>("set_overlay_size", { width, height });
}

/// Default size, centered on the primary monitor. The escape hatch for an
/// overlay that ended up somewhere the user cannot reach.
export async function resetOverlayGeometry(): Promise<OverlayGeometry> {
  return invoke<OverlayGeometry>("reset_overlay_geometry");
}

export async function getHotkeyStatus(): Promise<HotkeyStatus> {
  return invoke<HotkeyStatus>("get_hotkey_status");
}

export async function setHotkey(shortcut: string): Promise<HotkeyStatus> {
  return invoke<HotkeyStatus>("set_hotkey", { shortcut });
}

/// Subscribes to overlay visibility changes emitted by Rust. Returns an
/// unlisten function.
export function onOverlayVisibilityChanged(
  handler: (status: OverlayStatus) => void,
): Promise<UnlistenFn> {
  return listen<OverlayStatus>(OVERLAY_VISIBILITY_EVENT, (event) =>
    handler(event.payload),
  );
}
