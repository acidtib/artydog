import { solve } from "./solution";
import type { CalcState, Solution, Weapon } from "./types";
import {
  parseCoordinate,
  parsePoint,
  type ParsedPoint,
  type PointErrors,
} from "./validation";
import { DEFAULT_WEAPON_ID, WEAPONS, findWeapon } from "./weapons";

/// What the result strip reports. Out of range carries the shortfall because
/// "too far by 316 m" tells the user where to move; "out of range" does not.
export type CalcStatus =
  | { kind: "awaiting"; missing: "artillery" | "target" | "both" }
  | { kind: "invalid" }
  | { kind: "inRange" }
  | { kind: "tooClose"; byMeters: number }
  | { kind: "tooFar"; byMeters: number };

export interface CalcView {
  weapon: Weapon;
  artilleryErrors: PointErrors;
  targetErrors: PointErrors;
  solution: Solution | null;
  status: CalcStatus;
}

export function emptyCalcState(): CalcState {
  return {
    weaponId: "",
    artilleryX: "",
    artilleryY: "",
    targetX: "",
    targetY: "",
  };
}

/// While the user is still typing, an empty field is neutral rather
/// than "Required".
function visibleErrors(
  errors: PointErrors,
  x: string,
  y: string,
): PointErrors {
  return {
    ...(x !== "" && errors.x !== undefined ? { x: errors.x } : {}),
    ...(y !== "" && errors.y !== undefined ? { y: errors.y } : {}),
  };
}

/// A blank field is still to come, not a mistake. Only text the user actually
/// typed can make a point invalid.
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

export function deriveCalcView(calc: CalcState): CalcView {
  const weapon =
    findWeapon(calc.weaponId) ??
    findWeapon(DEFAULT_WEAPON_ID) ??
    WEAPONS[0];

  const artillery = parsePoint(calc.artilleryX, calc.artilleryY);
  const target = parsePoint(calc.targetX, calc.targetY);

  const solution =
    artillery.ok && target.ok
      ? solve(weapon, artillery.value, target.value)
      : null;

  return {
    weapon,
    status: calcStatus(weapon, calc, artillery, target, solution),
    artilleryErrors: artillery.ok
      ? {}
      : visibleErrors(artillery.errors, calc.artilleryX, calc.artilleryY),
    targetErrors: target.ok
      ? {}
      : visibleErrors(target.errors, calc.targetX, calc.targetY),
    solution,
  };
}

export function editCalcPoint(
  calc: CalcState,
  point: "artillery" | "target",
  axis: "x" | "y",
  value: string,
): CalcState {
  if (point === "artillery") {
    return axis === "x"
      ? { ...calc, artilleryX: value }
      : { ...calc, artilleryY: value };
  }
  return axis === "x"
    ? { ...calc, targetX: value }
    : { ...calc, targetY: value };
}
