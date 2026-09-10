import type { Elevation, FiringTableEntry } from "./types";

// Distances arrive from hypot(), so a row hit can land a float step off.
const RANGE_EPSILON = 1e-6;

/// Interpolates linearly between bracketing rows; null outside the table.
export function elevationMil(
  table: readonly FiringTableEntry[],
  rangeMeters: number,
): Elevation | null {
  if (!Number.isFinite(rangeMeters)) {
    return null;
  }

  const mils = table
    .filter(([range]) => Math.abs(range - rangeMeters) <= RANGE_EPSILON)
    .map(([, mil]) => mil);

  if (mils.length > 0) {
    return { minMil: Math.min(...mils), maxMil: Math.max(...mils) };
  }

  for (let i = 0; i < table.length - 1; i++) {
    const [leftRange, leftMil] = table[i];
    const [rightRange, rightMil] = table[i + 1];

    // Strict comparisons, so rows sharing a range never bracket each other.
    if (rangeMeters > leftRange && rangeMeters < rightRange) {
      const factor = (rangeMeters - leftRange) / (rightRange - leftRange);
      const mil = leftMil + factor * (rightMil - leftMil);

      return { minMil: mil, maxMil: mil };
    }
  }

  return null;
}
