import { solve } from "./solution";
import type { CalcState, Solution, Weapon } from "./types";
import { parsePoint, type PointErrors } from "./validation";
import { DEFAULT_WEAPON_ID, WEAPONS, findWeapon } from "./weapons";

export interface CalcView {
  weapon: Weapon;
  mortarErrors: PointErrors;
  targetErrors: PointErrors;
  solution: Solution | null;
}

export function emptyCalcState(): CalcState {
  return {
    weaponId: "",
    mortarX: "",
    mortarY: "",
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

export function deriveCalcView(calc: CalcState): CalcView {
  const weapon =
    findWeapon(calc.weaponId) ??
    findWeapon(DEFAULT_WEAPON_ID) ??
    WEAPONS[0];

  const mortar = parsePoint(calc.mortarX, calc.mortarY);
  const target = parsePoint(calc.targetX, calc.targetY);

  const solution =
    mortar.ok && target.ok
      ? solve(weapon, mortar.value, target.value)
      : null;

  return {
    weapon,
    mortarErrors: mortar.ok
      ? {}
      : visibleErrors(mortar.errors, calc.mortarX, calc.mortarY),
    targetErrors: target.ok
      ? {}
      : visibleErrors(target.errors, calc.targetX, calc.targetY),
    solution,
  };
}

export function editCalcPoint(
  calc: CalcState,
  point: "mortar" | "target",
  axis: "x" | "y",
  value: string,
): CalcState {
  if (point === "mortar") {
    return axis === "x"
      ? { ...calc, mortarX: value }
      : { ...calc, mortarY: value };
  }
  return axis === "x"
    ? { ...calc, targetX: value }
    : { ...calc, targetY: value };
}
