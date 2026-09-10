import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import Calculator from "./Calculator";

afterEach(() => {
  cleanup();
});

function setPoint(legend: string, x: string, y: string) {
  const group = screen.getByRole("group", { name: legend });

  fireEvent.change(within(group).getByLabelText("x"), { target: { value: x } });
  fireEvent.change(within(group).getByLabelText("y"), { target: { value: y } });
}

function calculate() {
  fireEvent.click(screen.getByRole("button", { name: "Calculate" }));
}

function rowValue(label: string): string {
  const row = screen.getByText(label).parentElement;

  return row?.lastElementChild?.textContent ?? "";
}

it("solves the reference vector entered through the form", () => {
  render(<Calculator />);

  setPoint("Mortar", "50", "50");
  setPoint("Target", "53", "54");
  calculate();

  expect(rowValue("Distance")).toBe("500 m");
  expect(rowValue("Azimuth")).toBe("36.9°");
  expect(rowValue("Elevation")).toBe("461 mil");
});

it("submits on Enter from a coordinate field", () => {
  render(<Calculator />);

  setPoint("Mortar", "50", "50");
  setPoint("Target", "53", "54");

  const group = screen.getByRole("group", { name: "Target" });
  fireEvent.submit(within(group).getByLabelText("y").closest("form")!);

  expect(rowValue("Distance")).toBe("500 m");
});

it("shows both arcs for a weapon that has them", () => {
  render(<Calculator />);

  fireEvent.change(screen.getByLabelText("Weapon"), {
    target: { value: "sph2" },
  });
  setPoint("Mortar", "50", "50");
  setPoint("Target", "65", "50");
  calculate();

  expect(rowValue("Elevation Low")).toBe("84 mil");
  expect(rowValue("Elevation High")).toBe("1213 mil");
});

it("reports which field is missing instead of calculating", () => {
  render(<Calculator />);

  setPoint("Mortar", "50", "");
  setPoint("Target", "53", "54");
  calculate();

  const mortar = screen.getByRole("group", { name: "Mortar" });
  expect(within(mortar).getByText("Required")).toBeInTheDocument();
  expect(within(mortar).getByLabelText("y")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.queryByText("Distance")).not.toBeInTheDocument();
});

it("rejects non-numeric coordinates", () => {
  render(<Calculator />);

  setPoint("Mortar", "abc", "50");
  setPoint("Target", "53", "54");
  calculate();

  expect(screen.getByText("Must be a number")).toBeInTheDocument();
  expect(screen.queryByText("Distance")).not.toBeInTheDocument();
});

it("flags a target outside the weapon range", () => {
  render(<Calculator />);

  setPoint("Mortar", "50", "50");
  setPoint("Target", "50", "60");
  calculate();

  expect(rowValue("Distance")).toBe("1000 m");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Out of range for L81 Mortar",
  );
});

it("drops a stale solution when an input changes", () => {
  render(<Calculator />);

  setPoint("Mortar", "50", "50");
  setPoint("Target", "53", "54");
  calculate();
  expect(screen.getByText("Distance")).toBeInTheDocument();

  setPoint("Target", "53", "55");

  expect(screen.queryByText("Distance")).not.toBeInTheDocument();
  expect(
    screen.getByText(/Enter coordinates and calculate/),
  ).toBeInTheDocument();
});
