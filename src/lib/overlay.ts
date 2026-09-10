import { invoke } from "@tauri-apps/api/core";

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

export async function getHotkeyStatus(): Promise<HotkeyStatus> {
  return invoke<HotkeyStatus>("get_hotkey_status");
}
