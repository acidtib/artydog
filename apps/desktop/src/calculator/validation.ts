import type { Coordinate } from "./types";

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

  // Number() accepts "0x10" and "1e5", so the shape is checked first.
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    return { ok: false, error: "Must be a number" };
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
