import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Overlay from "./Overlay";

const invokeMock = vi.fn();
const startResizeDraggingMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    startResizeDragging: (...args: unknown[]) => startResizeDraggingMock(...args),
  }),
}));

beforeEach(() => {
  invokeMock.mockReset();
  startResizeDraggingMock.mockReset();
  startResizeDraggingMock.mockResolvedValue(undefined);
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

it("the title bar is a drag region", () => {
  const { container } = render(<Overlay />);

  const dragRegion = container.querySelector("[data-tauri-drag-region]");
  expect(dragRegion).not.toBeNull();
  expect(dragRegion).toHaveTextContent("ARTYDOG");
});

it("the corner grip starts a resize", async () => {
  render(<Overlay />);

  fireEvent.mouseDown(screen.getByRole("button", { name: "Resize overlay" }));

  await vi.waitFor(() => {
    expect(startResizeDraggingMock).toHaveBeenCalledWith("SouthEast");
  });
});
