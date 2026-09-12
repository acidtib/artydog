import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";

// Must match CalcState in src-tauri/src/state.rs (serde camelCase).
const EMPTY_CALC = {
  weaponId: "",
  artilleryX: "",
  artilleryY: "",
  targetX: "",
  targetY: "",
};

const invokeMock = vi.fn();
const listenMock = vi.fn();
const checkMock = vi.fn();
const getVersionMock = vi.fn();
const hideMock = vi.fn();
const closeMock = vi.fn();

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
  relaunch: () => Promise.resolve(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    hide: () => hideMock(),
    close: () => closeMock(),
  }),
}));

beforeEach(() => {
  invokeMock.mockReset();
  listenMock.mockReset();
  checkMock.mockReset();
  getVersionMock.mockReset();
  hideMock.mockReset();
  closeMock.mockReset();
  hideMock.mockResolvedValue(undefined);
  closeMock.mockResolvedValue(undefined);
  listenMock.mockResolvedValue(() => {});
  getVersionMock.mockResolvedValue("0.1.3");
  checkMock.mockResolvedValue(null);
  invokeMock.mockImplementation((command: string) => {
    switch (command) {
      case "get_calc_state":
        return Promise.resolve(EMPTY_CALC);
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

it("shows the calculator by default, without settings content", async () => {
  render(<App />);

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith("get_calc_state");
  });
  expect(screen.getByRole("radiogroup", { name: "Weapon" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("shows the app version in the footer", async () => {
  render(<App />);

  expect(await screen.findByText("v0.1.3")).toBeInTheDocument();
});

it("the cog opens the settings dialog and closes it again", async () => {
  render(<App />);
  const cog = screen.getByRole("button", { name: "Settings" });

  fireEvent.click(cog);
  expect(await screen.findByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  await screen.findByText("Overlay status");

  fireEvent.click(cog);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("radiogroup", { name: "Weapon" })).toBeInTheDocument();
});

it("escape closes the settings dialog", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  await screen.findByRole("dialog");

  fireEvent.keyDown(window, { key: "Escape", code: "Escape" });

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("opening settings fetches overlay state", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  await screen.findByText("Overlay status");

  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith("get_overlay_state");
  });
});

it("checks for updates once per launch, not once per dialog open", async () => {
  render(<App />);
  await waitFor(() => {
    expect(checkMock).toHaveBeenCalledTimes(1);
  });
  const cog = screen.getByRole("button", { name: "Settings" });

  fireEvent.click(cog);
  await screen.findByText("Overlay status");
  fireEvent.click(cog);
  fireEvent.click(cog);
  await screen.findByText("Overlay status");

  expect(checkMock).toHaveBeenCalledTimes(1);
});

it("marks the cog when an update is waiting", async () => {
  checkMock.mockResolvedValue({ version: "0.2.0", downloadAndInstall: vi.fn() });

  render(<App />);

  expect(await screen.findByLabelText("Update available")).toBeInTheDocument();
});

it("keeps the calc bridge alert visible while settings is open", async () => {
  invokeMock.mockImplementation((command: string) => {
    if (command === "get_calc_state") {
      return Promise.reject(new Error("calc backend down"));
    }
    if (command === "get_overlay_state") {
      return Promise.resolve({ visible: false });
    }
    if (command === "get_hotkey_status") {
      return Promise.resolve({ shortcut: "Alt+KeyM", registered: true, error: null });
    }
    return Promise.reject(new Error(`unexpected command: ${command}`));
  });

  render(<App />);
  await screen.findByRole("alert");

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  await screen.findByText("Overlay status");

  expect(screen.getByRole("alert")).toHaveTextContent(/calc backend down/);
});

it("surfaces a failed calc bridge as an alert", async () => {
  invokeMock.mockImplementation((command: string) =>
    command === "get_calc_state"
      ? Promise.reject(new Error("calc backend down"))
      : Promise.reject(new Error(`unexpected command: ${command}`)),
  );
  listenMock.mockResolvedValue(() => {});

  render(<App />);

  expect(await screen.findByRole("alert")).toHaveTextContent(/calc backend down/);
});

it("reports a window failure that happens while a calc error stands", async () => {
  invokeMock.mockImplementation((command: string) =>
    command === "get_calc_state"
      ? Promise.reject(new Error("calc backend down"))
      : Promise.reject(new Error(`unexpected command: ${command}`)),
  );
  closeMock.mockRejectedValue(new Error("no window"));

  render(<App />);
  await screen.findByRole("alert");

  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  await waitFor(() => {
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });
  const texts = screen.getAllByRole("alert").map((el) => el.textContent);
  expect(texts.some((text) => text?.includes("calc backend down"))).toBe(true);
  expect(texts.some((text) => text?.includes("no window"))).toBe(true);
});

it("a toast can be dismissed by clicking it", async () => {
  closeMock.mockRejectedValue(new Error("no window"));

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  const toast = await screen.findByRole("alert");
  fireEvent.click(toast);

  await waitFor(() => {
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

it("the header controls tray the window and close it", async () => {
  render(<App />);

  // Minimize means "go to the tray", so it hides rather than iconifying.
  fireEvent.click(screen.getByRole("button", { name: "Minimize" }));
  await waitFor(() => {
    expect(hideMock).toHaveBeenCalled();
  });

  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => {
    expect(closeMock).toHaveBeenCalled();
  });
});

it("reports a window control failure instead of swallowing it", async () => {
  closeMock.mockRejectedValue(new Error("no window"));

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/no window/);
});
