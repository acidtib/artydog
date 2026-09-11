import { expect, it } from "vitest";
import { DEFAULT_WEAPON_ID } from "./weapons";
import {
  deriveCalcView,
  editCalcPoint,
  emptyCalcState,
} from "./derive";
import type { CalcState } from "./types";

function calc(overrides: Partial<CalcState>): CalcState {
  return { ...emptyCalcState(), ...overrides };
}

it("treats a fresh state as neutral: default weapon, no errors, no solution", () => {
  const view = deriveCalcView(emptyCalcState());

  expect(view.weapon.id).toBe(DEFAULT_WEAPON_ID);
  expect(view.mortarErrors).toEqual({});
  expect(view.targetErrors).toEqual({});
  expect(view.solution).toBeNull();
});

it("falls back to the default weapon for an unknown id", () => {
  const view = deriveCalcView(calc({ weaponId: "nope" }));

  expect(view.weapon.id).toBe(DEFAULT_WEAPON_ID);
});

it("errors only on non-empty invalid fields, never on empty ones", () => {
  const view = deriveCalcView(
    calc({ mortarX: "abc", targetX: "53", targetY: "54" }),
  );

  expect(view.mortarErrors).toEqual({ x: "Must be a number" });
  expect(view.targetErrors).toEqual({});
  expect(view.solution).toBeNull();
});

it("solves the reference vector when both points parse", () => {
  const view = deriveCalcView(
    calc({ mortarX: "50", mortarY: "50", targetX: "53", targetY: "54" }),
  );

  expect(view.solution).not.toBeNull();
  expect(view.solution!.distanceMeters).toBe(500);
  expect(view.solution!.azimuthDegrees).toBeCloseTo(36.9, 1);
  expect(view.solution!.inRange).toBe(true);
});

it("keeps a solution that is out of range, flagged with empty arcs", () => {
  const view = deriveCalcView(
    calc({ mortarX: "50", mortarY: "50", targetX: "50", targetY: "60" }),
  );

  expect(view.solution!.distanceMeters).toBe(1000);
  expect(view.solution!.inRange).toBe(false);
  expect(view.solution!.arcs).toHaveLength(0);
});

it("uses the selected weapon's arcs", () => {
  const view = deriveCalcView(
    calc({
      weaponId: "sph2",
      mortarX: "50",
      mortarY: "50",
      targetX: "65",
      targetY: "50",
    }),
  );

  expect(view.weapon.id).toBe("sph2");
  expect(view.solution!.arcs).toHaveLength(2);
});

it("edits one field immutably", () => {
  const before = calc({ mortarX: "50", targetY: "54" });

  const after = editCalcPoint(before, "target", "y", "60");

  expect(after).toEqual(calc({ mortarX: "50", targetY: "60" }));
  expect(before).toEqual(calc({ mortarX: "50", targetY: "54" }));
});
