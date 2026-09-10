import type { Coordinate } from "./types";

/// atan2 args are swapped from the usual (y, x) so 0 is north (+Y), 90 east (+X).
export function azimuthDegrees(from: Coordinate, to: Coordinate): number {
  const degrees =
    (Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI;

  return degrees < 0 ? degrees + 360 : degrees;
}
