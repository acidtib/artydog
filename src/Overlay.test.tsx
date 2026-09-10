import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Overlay from "./Overlay";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation((command: string) => {
    if (command === "hide_overlay") {
      return Promise.resolve({ visible: false });
    }
    return Promise.reject(new Error(`unexpected command: ${command}`));
  });
});

afterEach(() => {
  cleanup();
});

it("renders the overlay controls", () => {
  render(<Overlay />);
  expect(screen.getByText("ARTYDOG")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Hide Overlay" }),
  ).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Test Input")).toBeInTheDocument();
});

it("hide button invokes hide_overlay", async () => {
  render(<Overlay />);

  fireEvent.click(screen.getByRole("button", { name: "Hide Overlay" }));

  await vi.waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith("hide_overlay");
  });
});

it("test button counts clicks", () => {
  render(<Overlay />);

  const button = screen.getByRole("button", { name: /Test Button/ });
  fireEvent.click(button);
  fireEvent.click(button);

  expect(screen.getByRole("button", { name: "Test Button (2)" })).toBeInTheDocument();
});
