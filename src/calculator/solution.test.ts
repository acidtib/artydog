import { expect, it } from "vitest";
import { azimuthDegrees } from "./bearing";
import { distanceMeters } from "./distance";
import { elevationMil } from "./elevation";
import { formatMil } from "./format";
import { solve } from "./solution";
import type { Weapon } from "./types";
import { findWeapon } from "./weapons";

function weapon(id: string): Weapon {
  const found = findWeapon(id);

  expect(found, `weapon ${id} missing from the data`).toBeDefined();

  return found as Weapon;
}

function arcMil(solutionArcs: ReturnType<typeof solve>["arcs"], arcId: string) {
  const arc = solutionArcs.find((candidate) => candidate.arcId === arcId);

  expect(arc, `arc ${arcId} missing from the solution`).toBeDefined();

  return formatMil(arc!);
}

// Verified against a reference implementation; see docs/BALLISTICS.md.
it("solves the L81 Mortar reference vector", () => {
  const solution = solve(weapon("mortar"), { x: 50, y: 50 }, { x: 53, y: 54 });

  expect(solution.distanceMeters).toBeCloseTo(500, 6);
  expect(solution.azimuthDegrees).toBeCloseTo(36.87, 2);
  expect(solution.inRange).toBe(true);
  expect(arcMil(solution.arcs, "single")).toBe("461");
});

it("solves the SPH-2 reference vector with both arcs", () => {
  const solution = solve(weapon("sph2"), { x: 50, y: 50 }, { x: 65, y: 50 });

  expect(solution.distanceMeters).toBeCloseTo(1500, 6);
  expect(solution.azimuthDegrees).toBeCloseTo(90, 6);
  expect(solution.inRange).toBe(true);
  expect(arcMil(solution.arcs, "low")).toBe("84");
  expect(arcMil(solution.arcs, "high")).toBe("1213");
});

it("converts one grid unit to 100 m", () => {
  expect(distanceMeters({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(100);
  expect(distanceMeters({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(500);
});

it("measures azimuth clockwise from north", () => {
  const origin = { x: 0, y: 0 };

  expect(azimuthDegrees(origin, { x: 0, y: 1 })).toBe(0);
  expect(azimuthDegrees(origin, { x: 1, y: 0 })).toBe(90);
  expect(azimuthDegrees(origin, { x: 0, y: -1 })).toBe(180);
  expect(azimuthDegrees(origin, { x: -1, y: 0 })).toBe(270);
});

it("reports out of range without arcs below the minimum", () => {
  const solution = solve(weapon("mortar"), { x: 50, y: 50 }, { x: 50, y: 50.5 });

  expect(solution.distanceMeters).toBeCloseTo(50, 6);
  expect(solution.inRange).toBe(false);
  expect(solution.arcs).toHaveLength(0);
});

it("reports out of range without arcs beyond the maximum", () => {
  const solution = solve(weapon("mortar"), { x: 50, y: 50 }, { x: 50, y: 60 });

  expect(solution.distanceMeters).toBeCloseTo(1000, 6);
  expect(solution.inRange).toBe(false);
  expect(solution.arcs).toHaveLength(0);
});

it("accepts the exact range boundaries", () => {
  const mortar = weapon("mortar");

  expect(solve(mortar, { x: 0, y: 0 }, { x: 0, y: 1.32 }).inRange).toBe(true);
  expect(solve(mortar, { x: 0, y: 0 }, { x: 0, y: 6.84 }).inRange).toBe(true);
});

it("keeps signed deltas in meters", () => {
  const solution = solve(weapon("mortar"), { x: 50, y: 50 }, { x: 53, y: 46 });

  expect(solution.deltaXMeters).toBeCloseTo(300, 6);
  expect(solution.deltaYMeters).toBeCloseTo(-400, 6);
});

it("returns a mil span where the table gives two elevations at one range", () => {
  const high = weapon("sph2").arcs.find((arc) => arc.id === "high");
  const elevation = elevationMil(high!.table, 2629);

  expect(elevation).toEqual({ minMil: 610, maxMil: 620 });
  expect(formatMil(elevation!)).toBe("610-620");
});

it("tolerates float drift on an exact row hit", () => {
  const high = weapon("sph2").arcs.find((arc) => arc.id === "high");

  // hypot() can land a float step off a row, which must not fall through to
  // interpolation and lose the span, or past the last row and return null.
  expect(elevationMil(high!.table, 2629 + Number.EPSILON * 2629)).toEqual({
    minMil: 610,
    maxMil: 620,
  });
});

it("interpolates linearly between table rows", () => {
  const table = [
    [100, 900],
    [200, 800],
  ] as const;

  expect(elevationMil(table, 100)).toEqual({ minMil: 900, maxMil: 900 });
  expect(elevationMil(table, 150)).toEqual({ minMil: 850, maxMil: 850 });
  expect(elevationMil(table, 200)).toEqual({ minMil: 800, maxMil: 800 });
});

it("returns null outside the table instead of extrapolating", () => {
  const table = [
    [100, 900],
    [200, 800],
  ] as const;

  expect(elevationMil(table, 99)).toBeNull();
  expect(elevationMil(table, 201)).toBeNull();
  expect(elevationMil(table, Number.NaN)).toBeNull();
});
