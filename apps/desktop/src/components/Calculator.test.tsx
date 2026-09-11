import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { emptyCalcState } from "../calculator/derive";
import type { CalcState } from "../calculator/types";
import Calculator from "./Calculator";

afterEach(() => {
  cleanup();
});

function Harness({ initial }: { initial?: CalcState }) {
  const [calc, setCalc] = useState(initial ?? emptyCalcState());

  return <Calculator calc={calc} onChange={setCalc} />;
}

function setPoint(legend: string, x: string, y: string) {
  const group = screen.getByRole("group", { name: legend });

  fireEvent.change(within(group).getByLabelText("x"), { target: { value: x } });
  fireEvent.change(within(group).getByLabelText("y"), { target: { value: y } });
}

function rowValue(label: string): string {
  const row = screen.getByText(label).parentElement;

  return row?.lastElementChild?.textContent ?? "";
}

it("solves the reference vector live, with no button to click", () => {
  render(<Harness />);

  setPoint("Mortar", "50", "50");
  setPoint("Target", "53", "54");

  expect(rowValue("Distance")).toBe("500 m");
  expect(rowValue("Azimuth")).toBe("36.9°");
  expect(rowValue("Elevation")).toBe("461 mil");
});

it("shows both arcs for a weapon that has them", () => {
  render(<Harness />);

  fireEvent.change(screen.getByLabelText("Weapon"), {
    target: { value: "sph2" },
  });
  setPoint("Mortar", "50", "50");
  setPoint("Target", "65", "50");

  expect(rowValue("Elevation Low")).toBe("84 mil");
  expect(rowValue("Elevation High")).toBe("1213 mil");
});

it("stays neutral while fields are empty instead of demanding input", () => {
  render(<Harness />);

  expect(screen.queryByText("Required")).not.toBeInTheDocument();
  expect(screen.queryByText("Must be a number")).not.toBeInTheDocument();
  expect(
    screen.getByText("Enter coordinates to see a firing solution."),
  ).toBeInTheDocument();
});

it("rejects non-numeric coordinates and keeps the other axis error", () => {
  render(<Harness />);

  setPoint("Mortar", "abc", "def");
  setPoint("Target", "53", "54");

  const mortar = screen.getByRole("group", { name: "Mortar" });
  expect(within(mortar).getAllByText("Must be a number")).toHaveLength(2);

  fireEvent.change(within(mortar).getByLabelText("x"), {
    target: { value: "50" },
  });

  expect(within(mortar).getAllByText("Must be a number")).toHaveLength(1);
  expect(screen.queryByText("Distance")).not.toBeInTheDocument();
});

it("flags a target outside the weapon range", () => {
  render(<Harness />);

  setPoint("Mortar", "50", "50");
  setPoint("Target", "50", "60");

  expect(rowValue("Distance")).toBe("1000 m");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Out of range for L81 Mortar",
  );
});

it("updates the solution live when the target moves", () => {
  render(<Harness />);

  setPoint("Mortar", "50", "50");
  setPoint("Target", "53", "54");
  expect(rowValue("Distance")).toBe("500 m");

  fireEvent.change(
    within(screen.getByRole("group", { name: "Target" })).getByLabelText("y"),
    { target: { value: "60" } },
  );

  // Target is now (53, 60): sqrt(3^2 + 10^2) at 100 m per grid unit.
  expect(rowValue("Distance")).toBe("1044 m");
});
