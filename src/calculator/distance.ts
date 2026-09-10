import type { Coordinate } from "./types";
import { METERS_PER_UNIT } from "./weapons";

export function distanceMeters(from: Coordinate, to: Coordinate): number {
  return Math.hypot(to.x - from.x, to.y - from.y) * METERS_PER_UNIT;
}
