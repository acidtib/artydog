import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import App from "./App";
import desktop from "../../desktop/package.json";

afterEach(() => {
  cleanup();
});

it("shows the headline and the current version", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    /put rounds/i,
  );
  expect(screen.getByText("on target")).toBeInTheDocument();
  expect(
    screen.getByText("Artillery calculator for WARDOGS"),
  ).toBeInTheDocument();
  expect(
    screen.getAllByText(`v${desktop.version}`, { exact: false }).length,
  ).toBeGreaterThan(0);
});

it("offers both the browser calculator and the overlay download", () => {
  render(<App />);
  expect(
    screen.getByRole("link", { name: "Download the overlay" }),
  ).toHaveAttribute("href", "#download");
  expect(
    screen.getByRole("link", { name: "Use the browser version" }),
  ).toHaveAttribute("href", "#calculator");
  expect(document.getElementById("calculator")).toContainElement(
    screen.getByRole("radiogroup", { name: "Weapon" }),
  );
});

it("links to the repository and its releases", () => {
  render(<App />);
  for (const link of screen.getAllByRole("link", { name: "GitHub" })) {
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/acidtib/artydog",
    );
  }
  expect(screen.getAllByRole("link", { name: "All releases" }).length).toBe(
    2,
  );
});

it("spells out what the app does and never does to the game", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "What it does" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "What it never does" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Read game memory")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Read the code" })).toHaveAttribute(
    "href",
    "https://github.com/acidtib/artydog",
  );
});

it("points the download buttons at the current release assets", () => {
  render(<App />);
  const version = desktop.version;
  const base = `https://github.com/acidtib/artydog/releases/download/app-v${version}`;

  expect(screen.getByRole("link", { name: "Download .exe" })).toHaveAttribute(
    "href",
    `${base}/ArtyDog_${version}_x64-setup.exe`,
  );
  expect(
    screen.getByRole("link", { name: "Download AppImage" }),
  ).toHaveAttribute("href", `${base}/ArtyDog_${version}_amd64.AppImage`);
  expect(screen.getByRole("link", { name: "Download .deb" })).toHaveAttribute(
    "href",
    `${base}/ArtyDog_${version}_amd64.deb`,
  );
});

it("demo calculator starts with empty coordinates", () => {
  render(<App />);
  for (const name of ["Artillery X", "Artillery Y", "Target X", "Target Y"]) {
    expect(screen.getByLabelText(name)).toHaveValue("");
  }
  expect(screen.getByRole("status")).toHaveTextContent("Awaiting coordinates");
});

function enterCoordinates(values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(name), { target: { value } });
  }
}

it("demo calculator solves the verified SPH-2 test vector", () => {
  render(<App />);
  enterCoordinates({
    "Artillery X": "50",
    "Artillery Y": "50",
    "Target X": "65",
    "Target Y": "50",
  });

  // The overlay illustration shows the same vector, so query the calculator only.
  const calculator = within(document.getElementById("calculator")!);
  expect(calculator.getByText("1500 m")).toBeInTheDocument();
  expect(calculator.getByText("90.0°")).toBeInTheDocument();
  expect(calculator.getByText("84 mil")).toBeInTheDocument();
  expect(calculator.getByText("1213 mil")).toBeInTheDocument();
});

it("demo calculator solves the verified mortar vector when driven", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("radio", { name: "L81 Mortar" }));
  enterCoordinates({
    "Artillery X": "50",
    "Artillery Y": "50",
    "Target X": "53",
    "Target Y": "54",
  });

  expect(screen.getByText("500 m")).toBeInTheDocument();
  expect(screen.getByText("36.9°")).toBeInTheDocument();
  expect(screen.getByText("461 mil")).toBeInTheDocument();
  expect(screen.getByText("NE")).toBeInTheDocument();
});

it("demo calculator clears one point at a time", () => {
  render(<App />);
  enterCoordinates({
    "Artillery X": "50",
    "Artillery Y": "50",
    "Target X": "65",
    "Target Y": "50",
  });

  fireEvent.click(screen.getByRole("button", { name: "Clear target" }));

  expect(screen.getByLabelText("Target X")).toHaveValue("");
  expect(screen.getByLabelText("Target Y")).toHaveValue("");
  expect(screen.getByLabelText("Target X")).toHaveFocus();
  expect(screen.getByLabelText("Artillery X")).toHaveValue("50");
  expect(screen.getByRole("button", { name: "Clear target" })).toBeDisabled();
});
