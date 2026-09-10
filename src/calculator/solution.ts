import { azimuthDegrees } from "./bearing";
import { distanceMeters } from "./distance";
import { elevationMil } from "./elevation";
import type { ArcSolution, Coordinate, Solution, Weapon } from "./types";
import { METERS_PER_UNIT } from "./weapons";

const RANGE_EPSILON = 1e-6;

export function solve(
  weapon: Weapon,
  mortar: Coordinate,
  target: Coordinate,
): Solution {
  const distance = distanceMeters(mortar, target);

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
    azimuthDegrees: azimuthDegrees(mortar, target),
    deltaXMeters: (target.x - mortar.x) * METERS_PER_UNIT,
    deltaYMeters: (target.y - mortar.y) * METERS_PER_UNIT,
    inRange,
    arcs,
  };
}
