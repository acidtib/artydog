import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
});

it("shows the product name and coming soon", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "ArtyDog" })).toBeInTheDocument();
  expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
});

it("links to the repository and its releases", () => {
  render(<App />);
  expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/acidtib/artydog",
  );
  expect(screen.getByRole("link", { name: "Releases" })).toHaveAttribute(
    "href",
    "https://github.com/acidtib/artydog/releases/latest",
  );
});
