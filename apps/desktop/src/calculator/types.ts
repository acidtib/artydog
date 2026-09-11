/// A point in game grid units, not meters. See METERS_PER_UNIT.
export interface Coordinate {
  x: number;
  y: number;
}

/// One [rangeMeters, mil] row of a firing table.
export type FiringTableEntry = readonly [number, number];

export interface Arc {
  id: string;
  label: string;
  table: readonly FiringTableEntry[];
}

export interface Weapon {
  id: string;
  label: string;
  range: { minM: number; maxM: number };
  elevation: { minMil: number; maxMil: number };
  arcs: readonly Arc[];
}

/// These differ only where a firing table lists two elevations at one range.
export interface Elevation {
  minMil: number;
  maxMil: number;
}

export interface ArcSolution extends Elevation {
  arcId: string;
  arcLabel: string;
}

export interface Solution {
  distanceMeters: number;
  azimuthDegrees: number;
  deltaXMeters: number;
  deltaYMeters: number;
  inRange: boolean;
  arcs: readonly ArcSolution[];
}
