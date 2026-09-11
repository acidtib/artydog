import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { emptyCalcState } from "../calculator/derive";
import type { CalcState } from "../calculator/types";
import OverlayCalculator from "./OverlayCalculator";

afterEach(() => {
  cleanup();
});

const SOLVED: CalcState = {
  ...emptyCalcState(),
  weaponId: "mortar",
  mortarX: "50",
  mortarY: "50",
  targetX: "53",
  targetY: "54",
};

function rowValue(label: string): string {
  const row = screen.getByText(label).parentElement;

  return row?.lastElementChild?.textContent ?? "";
}

it("renders weapon, inputs, and a solved result from props", () => {
  render(<OverlayCalculator calc={SOLVED} onChange={vi.fn()} />);

  expect(
    (screen.getByLabelText("Weapon") as HTMLSelectElement).value,
  ).toBe("mortar");
  expect(
    (within(screen.getByRole("group", { name: "Mortar" })).getByLabelText("x") as HTMLInputElement).value,
  ).toBe("50");
  expect(rowValue("Distance")).toBe("500 m");
});

it("propagates coordinate edits as full CalcState writes", () => {
  const onChange = vi.fn();
  render(<OverlayCalculator calc={SOLVED} onChange={onChange} />);

  const target = screen.getByRole("group", { name: "Target" });
  fireEvent.change(within(target).getByLabelText("y"), {
    target: { value: "60" },
  });

  expect(onChange).toHaveBeenCalledWith({ ...SOLVED, targetY: "60" });
});

it("propagates weapon changes as full CalcState writes", () => {
  const onChange = vi.fn();
  render(<OverlayCalculator calc={SOLVED} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Weapon"), {
    target: { value: "sph2" },
  });

  expect(onChange).toHaveBeenCalledWith({ ...SOLVED, weaponId: "sph2" });
});
