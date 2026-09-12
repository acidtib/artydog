import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useUpdateCheck } from "./useUpdateCheck";

const checkMock = vi.fn();
const relaunchMock = vi.fn();
const downloadAndInstallMock = vi.fn();

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

beforeEach(() => {
  checkMock.mockReset();
  relaunchMock.mockReset();
  downloadAndInstallMock.mockReset();
  checkMock.mockResolvedValue(null);
  relaunchMock.mockResolvedValue(undefined);
  downloadAndInstallMock.mockResolvedValue(undefined);
});

it("runs one check on mount", async () => {
  renderHook(() => useUpdateCheck());

  await waitFor(() => {
    expect(checkMock).toHaveBeenCalledTimes(1);
  });
});

it("install is a no-op while a download is already running", async () => {
  checkMock.mockResolvedValue(availableUpdate());
  downloadAndInstallMock.mockImplementation(() => new Promise(() => {}));

  const { result } = renderHook(() => useUpdateCheck());
  await waitFor(() => {
    expect(result.current.update).not.toBeNull();
  });

  act(() => {
    result.current.install();
    result.current.install();
  });

  expect(downloadAndInstallMock).toHaveBeenCalledTimes(1);
  expect(result.current.installing).toBe(true);
});

it("a failed install reopens the button and reports the reason", async () => {
  checkMock.mockResolvedValue(availableUpdate());
  downloadAndInstallMock.mockRejectedValue(new Error("network gone"));

  const { result } = renderHook(() => useUpdateCheck());
  await waitFor(() => {
    expect(result.current.update).not.toBeNull();
  });

  act(() => {
    result.current.install();
  });

  await waitFor(() => {
    expect(result.current.installing).toBe(false);
  });
  expect(result.current.error).toMatch(/network gone/);
  expect(result.current.percent).toBeNull();

  act(() => {
    result.current.install();
  });

  expect(downloadAndInstallMock).toHaveBeenCalledTimes(2);
});

it("does not write state after unmount", async () => {
  let settle: (value: null) => void = () => {};
  checkMock.mockImplementation(() => new Promise((resolve) => (settle = resolve)));
  const errors: unknown[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((e) => errors.push(e));

  const { unmount } = renderHook(() => useUpdateCheck());
  unmount();
  await act(async () => {
    settle(null);
  });

  expect(errors).toEqual([]);
  spy.mockRestore();
});
