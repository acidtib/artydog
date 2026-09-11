import { expect, it } from "vitest";
import { shortcutFromEvent, shortcutLabel } from "./shortcut";

function event(code: string, modifiers: Partial<Record<string, boolean>> = {}) {
  return {
    code,
    altKey: modifiers.altKey ?? false,
    ctrlKey: modifiers.ctrlKey ?? false,
    shiftKey: modifiers.shiftKey ?? false,
    metaKey: modifiers.metaKey ?? false,
  };
}

it("builds a modifier and key combination", () => {
  expect(shortcutFromEvent(event("KeyM", { altKey: true }))).toBe("Alt+KeyM");
});

it("orders modifiers consistently", () => {
  const built = shortcutFromEvent(
    event("KeyK", { altKey: true, ctrlKey: true, shiftKey: true }),
  );
  expect(built).toBe("Control+Alt+Shift+KeyK");
});

it("allows a bare key", () => {
  expect(shortcutFromEvent(event("F9"))).toBe("F9");
});

it("waits while only modifiers are held", () => {
  expect(shortcutFromEvent(event("AltLeft", { altKey: true }))).toBeNull();
  expect(shortcutFromEvent(event("ShiftRight", { shiftKey: true }))).toBeNull();
});

it("labels a shortcut for a person", () => {
  expect(shortcutLabel("Alt+KeyM")).toBe("Alt + M");
  expect(shortcutLabel("Control+Digit1")).toBe("Control + 1");
  expect(shortcutLabel("F9")).toBe("F9");
});
