import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SettingsView from "./SettingsView";
import { useUpdateCheck } from "../lib/useUpdateCheck";

// SettingsView takes the update state as a prop; the harness supplies the
// real hook so these stay end-to-end.
function Harness() {
  return <SettingsView updater={useUpdateCheck()} />;
}

const invokeMock = vi.fn();
const listenMock = vi.fn();
const checkMock = vi.fn();
const relaunchMock = vi.fn();
const downloadAndInstallMock = vi.fn();
const getVersionMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: () => getVersionMock(),
}));

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: () => checkMock(),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: () => relaunchMock(),
}));

function availableUpdate() {
  return {
    version: "0.2.0",
    downloadAndInstall: (...args: unknown[]) => downloadAndInstallMock(...args),
  };
}

function visibilityHandler(): (event: { payload: { visible: boolean } }) => void {
  const call = listenMock.mock.calls.find(([event]) => event === "overlay-visibility");
  if (call === undefined) {
    throw new Error("overlay-visibility listener was not registered");
  }
  return call[1];
}

beforeEach(() => {
  invokeMock.mockReset();
  listenMock.mockReset();
  checkMock.mockReset();
  relaunchMock.mockReset();
  downloadAndInstallMock.mockReset();
  getVersionMock.mockReset();
  listenMock.mockResolvedValue(() => {});
  getVersionMock.mockResolvedValue("0.1.3");
  checkMock.mockResolvedValue(null);
  downloadAndInstallMock.mockResolvedValue(undefined);
  relaunchMock.mockResolvedValue(undefined);
  invokeMock.mockImplementation((command: string) => {
    switch (command) {
      case "get_overlay_state":
      case "toggle_overlay":
        return Promise.resolve({ visible: false });
      case "get_hotkey_status":
      case "set_hotkey":
        return Promise.resolve({ shortcut: "Alt+KeyM", registered: true, error: null });
      case "reset_overlay_geometry":
        return Promise.resolve({ x: 0, y: 0, width: 400, height: 520 });
      default:
        return Promise.reject(new Error(`unexpected command: ${command}`));
    }
  });
});

afterEach(() => {
  cleanup();
});

async function renderSettled() {
  render(<Harness />);
  await screen.findByText("Hidden");
}

it("shows the fetched overlay status and keycaps", async () => {
  await renderSettled();

  expect(screen.getByText("Overlay status")).toBeInTheDocument();
  expect(screen.getByText("Alt")).toBeInTheDocument();
  expect(screen.getByText("M")).toBeInTheDocument();
});

it("flips the action label with the status event", async () => {
  await renderSettled();
  expect(screen.getByRole("button", { name: "Show overlay" })).toBeInTheDocument();

  await act(async () => {
    visibilityHandler()({ payload: { visible: true } });
  });

  expect(screen.getByText("Visible")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Hide overlay" })).toBeInTheDocument();
});

it("keeps the status the event reported when the command answers late", async () => {
  // The window manager can still be mapping the overlay when show() returns,
  // so the command's own answer can be the older state. The event wins.
  let answer: (status: { visible: boolean }) => void = () => {};
  invokeMock.mockImplementation((command: string) => {
    switch (command) {
      case "toggle_overlay":
        return new Promise((resolve) => {
          answer = resolve as (status: { visible: boolean }) => void;
        });
      case "get_overlay_state":
        return Promise.resolve({ visible: false });
      case "get_hotkey_status":
        return Promise.resolve({ shortcut: "Alt+KeyM", registered: true, error: null });
      default:
        return Promise.reject(new Error(`unexpected command: ${command}`));
    }
  });

  await renderSettled();
  fireEvent.click(screen.getByRole("button", { name: "Show overlay" }));

  await act(async () => {
    visibilityHandler()({ payload: { visible: true } });
  });
  expect(screen.getByText("Visible")).toBeInTheDocument();

  await act(async () => {
    answer({ visible: false });
  });

  expect(screen.getByText("Visible")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Hide overlay" })).toBeInTheDocument();
});

it("toggle invokes toggle_overlay and resets the action label on failure", async () => {
  invokeMock.mockImplementation((command: string) => {
    if (command === "toggle_overlay") {
      return Promise.reject(new Error("no overlay"));
    }
    if (command === "get_overlay_state") {
      return Promise.resolve({ visible: false });
    }
    if (command === "get_hotkey_status") {
      return Promise.resolve({ shortcut: "Alt+KeyM", registered: true, error: null });
    }
    return Promise.reject(new Error(`unexpected command: ${command}`));
  });

  await renderSettled();
  fireEvent.click(screen.getByRole("button", { name: "Show overlay" }));

  await screen.findByText(/no overlay/);
});

it("reset position invokes reset_overlay_geometry", async () => {
  await renderSettled();

  fireEvent.click(screen.getByRole("button", { name: "Reset position" }));

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith("reset_overlay_geometry");
  });
});

it("recording captures the next key press and rebinds", async () => {
  await renderSettled();

  fireEvent.click(screen.getByRole("button", { name: /Press keys|Record/ }));
  fireEvent.keyDown(screen.getByRole("button", { name: /Press keys/ }), { code: "F9" });

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith("set_hotkey", { shortcut: "F9" });
  });
});

it("escape cancels recording without rebinding", async () => {
  await renderSettled();

  fireEvent.click(screen.getByRole("button", { name: /Press keys|Record/ }));
  fireEvent.keyDown(screen.getByRole("button", { name: /Press keys/ }), {
    key: "Escape",
    code: "Escape",
  });

  expect(screen.getByRole("button", { name: /Record/ })).toBeInTheDocument();
  expect(invokeMock).not.toHaveBeenCalledWith("set_hotkey", expect.anything());
});

/// App closes the settings dialog on a window-level Escape. A recording that
/// let its Escape bubble would cancel and take the whole pane with it.
it("keeps a cancelling escape away from the window", async () => {
  const onWindowEscape = vi.fn();
  window.addEventListener("keydown", onWindowEscape);

  try {
    await renderSettled();

    fireEvent.click(screen.getByRole("button", { name: /Press keys|Record/ }));
    fireEvent.keyDown(screen.getByRole("button", { name: /Press keys/ }), {
      key: "Escape",
      code: "Escape",
    });

    expect(screen.getByRole("button", { name: /Record/ })).toBeInTheDocument();
    expect(onWindowEscape).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener("keydown", onWindowEscape);
  }
});

it("flags an unregistered shortcut", async () => {
  invokeMock.mockImplementation((command: string) => {
    if (command === "get_hotkey_status") {
      return Promise.resolve({ shortcut: "Alt+KeyM", registered: false, error: null });
    }
    if (command === "get_overlay_state") {
      return Promise.resolve({ visible: false });
    }
    return Promise.reject(new Error(`unexpected command: ${command}`));
  });

  render(<Harness />);

  expect(await screen.findByText("not registered")).toBeInTheDocument();
});

it("shows the hotkey error string from the backend in red", async () => {
  invokeMock.mockImplementation((command: string) => {
    if (command === "get_hotkey_status") {
      return Promise.resolve({
        shortcut: "Alt+KeyM",
        registered: false,
        error: "Key combination may be reserved.",
      });
    }
    if (command === "get_overlay_state") {
      return Promise.resolve({ visible: false });
    }
    return Promise.reject(new Error(`unexpected command: ${command}`));
  });

  render(<Harness />);

  const message = await screen.findByText("Key combination may be reserved.");
  expect(message).toHaveClass("text-red-400");
});

it("announces an update found by the auto-check", async () => {
  checkMock.mockResolvedValue(availableUpdate());

  render(<Harness />);

  expect(await screen.findByText(/ArtyDog 0.2.0 is available/)).toBeInTheDocument();
});

it("manual check with no update says up to date", async () => {
  await renderSettled();

  fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));

  expect(await screen.findByText("Up to date")).toBeInTheDocument();
});

it("installs, relaunches, and reports install failure", async () => {
  checkMock.mockResolvedValue(availableUpdate());
  render(<Harness />);
  fireEvent.click(await screen.findByRole("button", { name: /Update & restart/ }));

  await waitFor(() => {
    expect(downloadAndInstallMock).toHaveBeenCalled();
    expect(relaunchMock).toHaveBeenCalled();
  });

  cleanup();
  downloadAndInstallMock.mockRejectedValue(new Error("network gone"));
  checkMock.mockResolvedValue(availableUpdate());
  render(<Harness />);
  fireEvent.click(await screen.findByRole("button", { name: /Update & restart/ }));

  expect(await screen.findByText(/network gone/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Update & restart/ })).toBeInTheDocument();
});

it("shows download progress", async () => {
  checkMock.mockResolvedValue(availableUpdate());
  downloadAndInstallMock.mockImplementation(
    (onProgress: (p: unknown) => void) =>
      new Promise(() => {
        onProgress({ event: "Started", data: { contentLength: 200 } });
        onProgress({ event: "Progress", data: { chunkLength: 50 } });
      }),
  );

  render(<Harness />);
  fireEvent.click(await screen.findByRole("button", { name: /Update & restart/ }));

  expect(await screen.findByText(/25%/)).toBeInTheDocument();
});

it("says so when the check fails instead of looking up to date", async () => {
  checkMock.mockRejectedValue(new Error("404"));

  render(<Harness />);

  expect(await screen.findByText(/Update check failed/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Update & restart/ })).not.toBeInTheDocument();
});

it("dismissing an available update hides it", async () => {
  checkMock.mockResolvedValue(availableUpdate());

  render(<Harness />);
  fireEvent.click(await screen.findByRole("button", { name: "Not now" }));

  expect(screen.queryByText(/is available/)).not.toBeInTheDocument();
});

it("a manual check re-shows an update that was dismissed", async () => {
  checkMock.mockResolvedValue(availableUpdate());

  render(<Harness />);
  fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
  expect(screen.queryByText(/is available/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));

  expect(await screen.findByText(/ArtyDog 0.2.0 is available/)).toBeInTheDocument();
});

it("keeps the check button after a failed check so it can be retried", async () => {
  checkMock.mockRejectedValue(new Error("offline"));

  render(<Harness />);
  await screen.findByText(/Update check failed/);

  const retry = screen.getByRole("button", { name: "Check for updates" });
  checkMock.mockResolvedValue(availableUpdate());
  fireEvent.click(retry);

  expect(await screen.findByText(/ArtyDog 0.2.0 is available/)).toBeInTheDocument();
  expect(screen.queryByText(/Update check failed/)).not.toBeInTheDocument();
});

it("clears a stale up to date note on the next check", async () => {
  await renderSettled();

  fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));
  await screen.findByText("Up to date");

  checkMock.mockResolvedValue(availableUpdate());
  fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));

  expect(await screen.findByText(/ArtyDog 0.2.0 is available/)).toBeInTheDocument();
  expect(screen.queryByText("Up to date")).not.toBeInTheDocument();
});

it("hides the install button while downloading without a content length", async () => {
  checkMock.mockResolvedValue(availableUpdate());
  downloadAndInstallMock.mockImplementation(
    (onProgress: (p: unknown) => void) =>
      new Promise(() => {
        onProgress({ event: "Started", data: { contentLength: null } });
        onProgress({ event: "Progress", data: { chunkLength: 50 } });
      }),
  );

  render(<Harness />);
  fireEvent.click(await screen.findByRole("button", { name: /Update & restart/ }));

  expect(await screen.findByText("Downloading…")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Update & restart/ })).not.toBeInTheDocument();
});
