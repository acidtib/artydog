import type { Elevation } from "./types";

/// A span only where the firing table gave two elevations at one range.
export function formatMil(elevation: Elevation): string {
  const min = Math.round(elevation.minMil);
  const max = Math.round(elevation.maxMil);

  return min === max ? `${min}` : `${min}-${max}`;
}

export function formatDistance(meters: number): string {
  return `${Math.round(meters)} m`;
}

export function formatAzimuth(degrees: number): string {
  return `${degrees.toFixed(1)}°`;
}

export function formatDelta(meters: number): string {
  const rounded = Math.round(meters);

  return `${rounded >= 0 ? "+" : ""}${rounded} m`;
}
