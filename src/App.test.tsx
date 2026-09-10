import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";

// Rust emits OVERLAY_VISIBILITY_EVENT ("overlay-visibility") with an
// OverlayStatus payload.
const OVERLAY_VISIBILITY_EVENT = "overlay-visibility";

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

function mockBackend() {
  invokeMock.mockImplementation((command: string) => {
    switch (command) {
      case "get_overlay_state":
      case "toggle_overlay":
        return Promise.resolve({ visible: false });
      case "get_hotkey_status":
        return Promise.resolve({ shortcut: "M", registered: true, error: null });
      case "reset_overlay_geometry":
        return Promise.resolve({ x: 760, y: 390, width: 400, height: 300 });
      default:
        return Promise.reject(new Error(`unexpected command: ${command}`));
    }
  });
  listenMock.mockResolvedValue(() => {});
}

/// The handler the app registered for visibility events.
function visibilityHandler(): (event: { payload: { visible: boolean } }) => void {
  expect(listenMock).toHaveBeenCalled();
  const calls = listenMock.mock.calls;
  return calls[calls.length - 1][1];
}

async function renderSettled() {
  render(<App />);
  await screen.findByText(/Overlay status: Hidden/);
}

beforeEach(() => {
  invokeMock.mockReset();
  listenMock.mockReset();
  mockBackend();
});

afterEach(() => {
  cleanup();
});

it("fetches the initial status once and registers the event listener", async () => {
  await renderSettled();
  expect(screen.getByText(/Hotkey "M": registered/)).toBeInTheDocument();

  const commands = invokeMock.mock.calls.map((call) => call[0]);
  expect(commands).toEqual(["get_overlay_state", "get_hotkey_status"]);
  expect(listenMock).toHaveBeenCalledWith(
    OVERLAY_VISIBILITY_EVENT,
    expect.any(Function),
  );
});

it("updates the status when Rust emits a visibility event", async () => {
  await renderSettled();
  expect(screen.getByText(/Overlay status: Hidden/)).toBeInTheDocument();

  await act(async () => {
    visibilityHandler()({ payload: { visible: true } });
  });

  expect(screen.getByText(/Overlay status: Visible/)).toBeInTheDocument();
});

it("ignores the initial fetch result when an event arrived first", async () => {
  let resolveFetch: (value: { visible: boolean }) => void = () => {};
  invokeMock.mockImplementation((command: string) => {
    if (command === "get_overlay_state") {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    }
    if (command === "get_hotkey_status") {
      return Promise.resolve({ shortcut: "M", registered: true, error: null });
    }
    return Promise.reject(new Error(`unexpected command: ${command}`));
  });
  listenMock.mockResolvedValue(() => {});

  render(<App />);

  // An event lands while the initial fetch is still in flight; the fetched
  // value is stale and must not overwrite the event.
  await waitFor(() => expect(listenMock).toHaveBeenCalled());
  await act(async () => {
    visibilityHandler()({ payload: { visible: true } });
    resolveFetch({ visible: false });
  });

  expect(screen.getByText(/Overlay status: Visible/)).toBeInTheDocument();
});

it("does not poll the backend after the initial load", async () => {  await renderSettled();
  const callsAfterLoad = invokeMock.mock.calls.length;

  await new Promise((resolve) => setTimeout(resolve, 1100));

  expect(invokeMock.mock.calls.length).toBe(callsAfterLoad);

  // Status changes still arrive, via the event instead of polling.
  await act(async () => {
    visibilityHandler()({ payload: { visible: true } });
  });
  expect(screen.getByText(/Overlay status: Visible/)).toBeInTheDocument();
  expect(invokeMock.mock.calls.length).toBe(callsAfterLoad);
});

it("shows an error when the initial fetch fails", async () => {
  invokeMock.mockRejectedValue(new Error("backend down"));
  listenMock.mockResolvedValue(() => {});

  render(<App />);

  await screen.findByText(/backend down/);
  expect(screen.getByText(/Overlay status: …/)).toBeInTheDocument();
});

it("toggle button invokes toggle_overlay and reflects the new status", async () => {
  invokeMock.mockImplementation((command: string) => {
    if (command === "toggle_overlay") {
      return Promise.resolve({ visible: true });
    }
    if (command === "get_overlay_state") {
      return Promise.resolve({ visible: false });
    }
    if (command === "get_hotkey_status") {
      return Promise.resolve({ shortcut: "M", registered: true, error: null });
    }
    return Promise.reject(new Error(`unexpected command: ${command}`));
  });

  await renderSettled();

  fireEvent.click(screen.getByRole("button", { name: "Toggle Overlay" }));

  await screen.findByText(/Overlay status: Visible/);
  await waitFor(() => {
    expect(invokeMock.mock.calls.some((call) => call[0] === "toggle_overlay")).toBe(true);
  });
});

it("reset position invokes reset_overlay_geometry", async () => {
  await renderSettled();

  fireEvent.click(screen.getByRole("button", { name: "Reset Position" }));

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith("reset_overlay_geometry");
  });
});
