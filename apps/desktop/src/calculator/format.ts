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

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/// Sectors are centred on their letter, so N runs from 337.5 through 22.5.
export function compassPoint(degrees: number): string {
  const sector = Math.round((((degrees % 360) + 360) % 360) / 45) % COMPASS.length;

  return COMPASS[sector];
}

export function formatDelta(meters: number): string {
  const rounded = Math.round(meters);

  return `${rounded >= 0 ? "+" : ""}${rounded} m`;
}
