import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Overlay from "./Overlay";

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

// Must match CalcState in src-tauri/src/state.rs (serde camelCase).
const EMPTY_CALC = {
  weaponId: "",
  artilleryX: "",
  artilleryY: "",
  targetX: "",
  targetY: "",
};

beforeEach(() => {
  invokeMock.mockReset();
  listenMock.mockReset();
  listenMock.mockResolvedValue(() => {});
  invokeMock.mockImplementation((command: string) => {
    if (command === "get_calc_state") {
      return Promise.resolve(EMPTY_CALC);
    }
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
  expect(screen.getByLabelText("Weapon")).toBeInTheDocument();
});

it("hide button invokes hide_overlay", async () => {
  render(<Overlay />);

  fireEvent.click(screen.getByRole("button", { name: "Hide Overlay" }));

  await vi.waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith("hide_overlay");
  });
});

it("the title bar is a drag region", () => {
  const { container } = render(<Overlay />);

  const dragRegion = container.querySelector("[data-tauri-drag-region]");
  expect(dragRegion).not.toBeNull();
  expect(dragRegion).toHaveTextContent("ARTYDOG");
});
