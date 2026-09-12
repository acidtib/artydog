import { expect, it } from "vitest";
import { parseCoordinate, parsePoint } from "./validation";

it("accepts plain and signed decimals", () => {
  expect(parseCoordinate("50")).toEqual({ ok: true, value: 50 });
  expect(parseCoordinate("23.35")).toEqual({ ok: true, value: 23.35 });
  expect(parseCoordinate("  50.5  ")).toEqual({ ok: true, value: 50.5 });
  expect(parseCoordinate("-7")).toEqual({ ok: true, value: -7 });
  expect(parseCoordinate(".5")).toEqual({ ok: true, value: 0.5 });
});

it("rejects empty input as required", () => {
  expect(parseCoordinate("")).toEqual({ ok: false, error: "Required" });
  expect(parseCoordinate("   ")).toEqual({ ok: false, error: "Required" });
});

it("rejects values Number() would silently accept", () => {
  for (const input of ["abc", "0x10", "1e5", "1,5", "--1", "1.2.3"]) {
    expect(parseCoordinate(input), input).toEqual({
      ok: false,
      error: "Not a number",
    });
  }
});

it("reports errors per axis", () => {
  expect(parsePoint("50", "60")).toEqual({
    ok: true,
    value: { x: 50, y: 60 },
  });
  expect(parsePoint("", "60")).toEqual({
    ok: false,
    errors: { x: "Required" },
  });
  expect(parsePoint("abc", "")).toEqual({
    ok: false,
    errors: { x: "Not a number", y: "Required" },
  });
});
