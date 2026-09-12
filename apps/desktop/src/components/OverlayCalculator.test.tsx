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
  artilleryX: "50",
  artilleryY: "50",
  targetX: "53",
  targetY: "54",
};

function rowValue(label: string): string {
  const row = screen.getByText(label).parentElement;

  return row?.lastElementChild?.textContent ?? "";
}

it("renders weapon, inputs, and a solved result from props", () => {
  render(<OverlayCalculator calc={SOLVED} onChange={vi.fn()} />);

  expect(screen.getByRole("radio", { name: "L81 Mortar" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(
    (within(screen.getByRole("group", { name: "Artillery" })).getByLabelText("x") as HTMLInputElement).value,
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

  fireEvent.click(screen.getByRole("radio", { name: "SPH-2" }));

  expect(onChange).toHaveBeenCalledWith({ ...SOLVED, weaponId: "sph2" });
});
