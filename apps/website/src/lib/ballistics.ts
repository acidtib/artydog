import data from "../data/weapons.json";

/// Browser copy of the desktop calculator (apps/desktop/src/calculator), so the
/// landing page demo runs the same math on the same firing tables. The JSON is
/// a verbatim copy of the desktop data file; refresh it when the tables change.

export interface Coordinate {
  x: number;
  y: number;
}

export interface Arc {
  id: string;
  label: string;
  table: readonly (readonly [number, number])[];
}

export interface Weapon {
  id: string;
  label: string;
  range: { minM: number; maxM: number };
  arcs: readonly Arc[];
}

export interface ArcSolution {
  arcId: string;
  arcLabel: string;
  minMil: number;
  maxMil: number;
}

export interface Solution {
  distanceMeters: number;
  azimuthDegrees: number;
  deltaXMeters: number;
  deltaYMeters: number;
  inRange: boolean;
  arcs: readonly ArcSolution[];
}

export type CalcStatus =
  | { kind: "awaiting"; missing: "artillery" | "target" | "both" }
  | { kind: "invalid" }
  | { kind: "inRange" }
  | { kind: "tooClose"; byMeters: number }
  | { kind: "tooFar"; byMeters: number };

export const METERS_PER_UNIT: number = data.metersPerUnit;
export const DEFAULT_WEAPON_ID: string = data.defaultWeapon;

export const WEAPONS: readonly Weapon[] = data.weapons.map((weapon) => ({
  ...weapon,
  arcs: weapon.arcs.map((arc) => ({
    ...arc,
    table: arc.table.map(([range, mil]) => [range, mil] as const),
  })),
}));

export function findWeapon(id: string): Weapon | undefined {
  return WEAPONS.find((weapon) => weapon.id === id);
}

/// atan2 args are swapped from the usual (y, x) so 0 is north (+Y), 90 east (+X).
export function azimuthDegrees(from: Coordinate, to: Coordinate): number {
  const degrees = (Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI;

  return degrees < 0 ? degrees + 360 : degrees;
}

export function distanceMeters(from: Coordinate, to: Coordinate): number {
  return Math.hypot(to.x - from.x, to.y - from.y) * METERS_PER_UNIT;
}

const RANGE_EPSILON = 1e-6;

/// Linear interpolation between bracketing rows; null outside the table.
function elevationMil(
  table: readonly (readonly [number, number])[],
  rangeMeters: number,
): { minMil: number; maxMil: number } | null {
  if (!Number.isFinite(rangeMeters)) {
    return null;
  }

  const exact = table
    .filter(([range]) => Math.abs(range - rangeMeters) <= RANGE_EPSILON)
    .map(([, mil]) => mil);

  if (exact.length > 0) {
    return { minMil: Math.min(...exact), maxMil: Math.max(...exact) };
  }

  for (let i = 0; i < table.length - 1; i++) {
    const [leftRange, leftMil] = table[i];
    const [rightRange, rightMil] = table[i + 1];

    if (rangeMeters > leftRange && rangeMeters < rightRange) {
      const factor = (rangeMeters - leftRange) / (rightRange - leftRange);
      const mil = leftMil + factor * (rightMil - leftMil);

      return { minMil: mil, maxMil: mil };
    }
  }

  return null;
}

export function solve(
  weapon: Weapon,
  artillery: Coordinate,
  target: Coordinate,
): Solution {
  const distance = distanceMeters(artillery, target);
  // Tables overhang the usable envelope, so range comes from the weapon.
  const inRange =
    distance + RANGE_EPSILON >= weapon.range.minM &&
    distance <= weapon.range.maxM + RANGE_EPSILON;

  const arcs: ArcSolution[] = [];

  if (inRange) {
    for (const arc of weapon.arcs) {
      const elevation = elevationMil(arc.table, distance);

      if (elevation !== null) {
        arcs.push({ arcId: arc.id, arcLabel: arc.label, ...elevation });
      }
    }
  }

  return {
    distanceMeters: distance,
    azimuthDegrees: azimuthDegrees(artillery, target),
    deltaXMeters: (target.x - artillery.x) * METERS_PER_UNIT,
    deltaYMeters: (target.y - artillery.y) * METERS_PER_UNIT,
    inRange,
    arcs,
  };
}

export type ParsedCoordinate =
  | { ok: true; value: number }
  | { ok: false; error: string };

export interface PointErrors {
  x?: string;
  y?: string;
}

export type ParsedPoint =
  | { ok: true; value: Coordinate }
  | { ok: false; errors: PointErrors };

export function parseCoordinate(text: string): ParsedCoordinate {
  const trimmed = text.trim();

  if (trimmed === "") {
    return { ok: false, error: "Required" };
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    return { ok: false, error: "Not a number" };
  }

  return { ok: true, value: Number(trimmed) };
}

export function parsePoint(x: string, y: string): ParsedPoint {
  const parsedX = parseCoordinate(x);
  const parsedY = parseCoordinate(y);

  if (parsedX.ok && parsedY.ok) {
    return { ok: true, value: { x: parsedX.value, y: parsedY.value } };
  }

  return {
    ok: false,
    errors: {
      ...(parsedX.ok ? {} : { x: parsedX.error }),
      ...(parsedY.ok ? {} : { y: parsedY.error }),
    },
  };
}

export interface CalcState {
  weaponId: string;
  artilleryX: string;
  artilleryY: string;
  targetX: string;
  targetY: string;
}

export interface CalcView {
  weapon: Weapon;
  artilleryErrors: PointErrors;
  targetErrors: PointErrors;
  solution: Solution | null;
  status: CalcStatus;
}

export function deriveCalcView(calc: CalcState): CalcView {
  const weapon =
    findWeapon(calc.weaponId) ?? findWeapon(DEFAULT_WEAPON_ID) ?? WEAPONS[0];

  const artillery = parsePoint(calc.artilleryX, calc.artilleryY);
  const target = parsePoint(calc.targetX, calc.targetY);
  const solution =
    artillery.ok && target.ok
      ? solve(weapon, artillery.value, target.value)
      : null;

  return {
    weapon,
    solution,
    status: calcStatus(weapon, calc, artillery, target, solution),
    artilleryErrors: pointErrors(artillery, calc.artilleryX, calc.artilleryY),
    targetErrors: pointErrors(target, calc.targetX, calc.targetY),
  };
}

function pointProgress(
  parsed: ParsedPoint,
  x: string,
  y: string,
): "ok" | "pending" | "invalid" {
  if (parsed.ok) {
    return "ok";
  }
  const mistyped = [x, y].some(
    (text) => text.trim() !== "" && !parseCoordinate(text).ok,
  );

  return mistyped ? "invalid" : "pending";
}

function calcStatus(
  weapon: Weapon,
  calc: CalcState,
  artillery: ParsedPoint,
  target: ParsedPoint,
  solution: Solution | null,
): CalcStatus {
  if (solution === null) {
    const gun = pointProgress(artillery, calc.artilleryX, calc.artilleryY);
    const shot = pointProgress(target, calc.targetX, calc.targetY);

    if (gun === "invalid" || shot === "invalid") {
      return { kind: "invalid" };
    }
    if (gun !== "ok" && shot !== "ok") {
      return { kind: "awaiting", missing: "both" };
    }
    return { kind: "awaiting", missing: gun === "ok" ? "target" : "artillery" };
  }

  if (solution.inRange) {
    return { kind: "inRange" };
  }

  return solution.distanceMeters < weapon.range.minM
    ? { kind: "tooClose", byMeters: weapon.range.minM - solution.distanceMeters }
    : { kind: "tooFar", byMeters: solution.distanceMeters - weapon.range.maxM };
}

/// An empty field is still to come, not a mistake.
function pointErrors(
  parsed: ParsedPoint,
  x: string,
  y: string,
): PointErrors {
  if (parsed.ok) {
    return {};
  }

  return {
    ...(x !== "" && parsed.errors.x !== undefined ? { x: parsed.errors.x } : {}),
    ...(y !== "" && parsed.errors.y !== undefined ? { y: parsed.errors.y } : {}),
  };
}

export function formatMil(elevation: {
  minMil: number;
  maxMil: number;
}): string {
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

export function compassPoint(degrees: number): string {
  const sector =
    Math.round((((degrees % 360) + 360) % 360) / 45) % COMPASS.length;

  return COMPASS[sector];
}

export function formatDelta(meters: number): string {
  const rounded = Math.round(meters);

  return `${rounded >= 0 ? "+" : ""}${rounded} m`;
}
