import { expect, it } from "vitest";
import { compassPoint } from "./format";

it("names the eighth of the compass an azimuth falls in", () => {
  expect(compassPoint(0)).toBe("N");
  expect(compassPoint(36.9)).toBe("NE");
  expect(compassPoint(90)).toBe("E");
  expect(compassPoint(180)).toBe("S");
  expect(compassPoint(270)).toBe("W");
  expect(compassPoint(315)).toBe("NW");
});

it("centres each sector on its letter rather than starting at it", () => {
  expect(compassPoint(22.4)).toBe("N");
  expect(compassPoint(22.6)).toBe("NE");
  expect(compassPoint(337.5)).toBe("N");
});

/// 359.9 rounds to a full turn, which is north again, not a ninth sector.
it("wraps the top of the circle back to north", () => {
  expect(compassPoint(359.9)).toBe("N");
  expect(compassPoint(360)).toBe("N");
});
