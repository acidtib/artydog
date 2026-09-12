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

  fireEvent.click(screen.getByRole("radio", { name: "L81 Mortar" }));
  setPoint("Artillery", "50", "50");
  setPoint("Target", "53", "54");

  expect(rowValue("Distance")).toBe("500 m");
  // The compass point trails the number in the same cell.
  expect(rowValue("Azimuth")).toBe("36.9°NE");
  expect(rowValue("Elevation")).toBe("461 mil");
});

it("shows both arcs for a weapon that has them", () => {
  render(<Harness />);

  fireEvent.click(screen.getByRole("radio", { name: "SPH-2" }));
  setPoint("Artillery", "50", "50");
  setPoint("Target", "65", "50");

  expect(rowValue("Elevation Low")).toBe("84 mil");
  expect(rowValue("Elevation High")).toBe("1213 mil");
});

it("keeps an arc's row when only the other arc reaches the target", () => {
  render(<Harness />);

  fireEvent.click(screen.getByRole("radio", { name: "SPH-2" }));
  setPoint("Artillery", "50", "50");
  // 1000 m is in range for the weapon, but below where its low table starts.
  setPoint("Target", "60", "50");

  expect(screen.getByRole("status")).toHaveTextContent("In range");
  expect(rowValue("Elevation High")).toBe("1340 mil");
  expect(rowValue("Elevation Low")).toBe("-");
});

it("stays neutral while fields are empty instead of demanding input", () => {
  render(<Harness />);

  fireEvent.click(screen.getByRole("radio", { name: "L81 Mortar" }));
  expect(screen.queryByText("Required")).not.toBeInTheDocument();
  expect(screen.queryByText("Not a number")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Awaiting coordinates");
  // The rows the weapon will fill are present from the start, so nothing shifts.
  expect(rowValue("Distance")).toBe("-");
  expect(rowValue("Elevation")).toBe("-");
});

it("refuses anything that is not on its way to being a number", () => {
  render(<Harness />);

  const x = within(screen.getByRole("group", { name: "Artillery" })).getByLabelText(
    "x",
  ) as HTMLInputElement;

  for (const rejected of ["abc", "5e3", "1,5", "12 ", "1.2.3", "#", ".", ".5"]) {
    fireEvent.change(x, { target: { value: rejected } });
    expect(x.value).toBe("");
  }

  // Nothing was rejected into an error state either: the field stayed empty.
  expect(screen.queryByText("Not a number")).not.toBeInTheDocument();
});

it("accepts a number as it is being typed, sign and decimal point included", () => {
  render(<Harness />);

  const x = within(screen.getByRole("group", { name: "Artillery" })).getByLabelText(
    "x",
  ) as HTMLInputElement;

  for (const accepted of ["5", "53", "53.", "53.4", "-", "-12.5"]) {
    fireEvent.change(x, { target: { value: accepted } });
    expect(x.value).toBe(accepted);
  }
});

it("flags a target outside the weapon range", () => {
  render(<Harness />);

  fireEvent.click(screen.getByRole("radio", { name: "L81 Mortar" }));
  setPoint("Artillery", "50", "50");
  setPoint("Target", "50", "60");

  expect(rowValue("Distance")).toBe("1000 m");
  // The shortfall is the actionable part: 1000 m against a 684 m envelope.
  expect(screen.getByRole("status")).toHaveTextContent(
    "Too far by 316 m · max 684 m",
  );
  // The row stays so the missing elevation reads as absent, not overlooked.
  expect(rowValue("Elevation")).toBe("-");
});

it("starts on SPH-2", () => {
  render(<Harness />);

  expect(screen.getByRole("radio", { name: "SPH-2" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

it("names the point still missing instead of a blanket wait", () => {
  render(<Harness />);

  expect(screen.getByRole("status")).toHaveTextContent("Awaiting coordinates");

  setPoint("Artillery", "50", "50");
  expect(screen.getByRole("status")).toHaveTextContent("Awaiting target");

  setPoint("Target", "65", "50");
  expect(screen.getByRole("status")).toHaveTextContent("In range");
});

it("calls out a target only one arc can reach", () => {
  render(<Harness />);

  fireEvent.click(screen.getByRole("radio", { name: "SPH-2" }));
  setPoint("Artillery", "50", "50");
  // 1000 m: in range for the weapon, below where its low table starts.
  setPoint("Target", "60", "50");

  expect(screen.getByRole("status")).toHaveTextContent("In range · high arc only");
});

it("flags a target under the weapon minimum as too close", () => {
  render(<Harness />);

  fireEvent.click(screen.getByRole("radio", { name: "SPH-2" }));
  setPoint("Artillery", "50", "50");
  setPoint("Target", "53", "50");

  expect(screen.getByRole("status")).toHaveTextContent(
    "Too close by 480 m · min 780 m",
  );
});

it("updates the solution live when the target moves", () => {
  render(<Harness />);

  setPoint("Artillery", "50", "50");
  setPoint("Target", "53", "54");
  expect(rowValue("Distance")).toBe("500 m");

  fireEvent.change(
    within(screen.getByRole("group", { name: "Target" })).getByLabelText("y"),
    { target: { value: "60" } },
  );

  // Target is now (53, 60): sqrt(3^2 + 10^2) at 100 m per grid unit.
  expect(rowValue("Distance")).toBe("1044 m");
});

it("clears only the point whose clear button was pressed", () => {
  render(<Harness />);

  setPoint("Artillery", "50", "50");
  setPoint("Target", "65", "50");
  fireEvent.click(screen.getByRole("button", { name: "Clear artillery" }));

  const artillery = within(screen.getByRole("group", { name: "Artillery" }));
  const target = within(screen.getByRole("group", { name: "Target" }));

  expect(artillery.getByLabelText("x")).toHaveValue("");
  expect(artillery.getByLabelText("y")).toHaveValue("");
  expect(artillery.getByLabelText("x")).toHaveFocus();
  expect(target.getByLabelText("x")).toHaveValue("65");
  expect(target.getByLabelText("y")).toHaveValue("50");
  expect(screen.getByRole("status")).toHaveTextContent(/Awaiting artillery/);
});

it("disables a point's clear button while the point is empty", () => {
  render(<Harness />);

  const clearTarget = screen.getByRole("button", { name: "Clear target" });
  expect(clearTarget).toBeDisabled();

  setPoint("Target", "65", "");
  expect(clearTarget).toBeEnabled();
});
