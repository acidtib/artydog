import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import UpdateBanner from "./UpdateBanner";

const checkMock = vi.fn();
const relaunchMock = vi.fn();
const downloadAndInstallMock = vi.fn();

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: () => checkMock(),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: () => relaunchMock(),
}));

/// The shape `check()` resolves to when a newer release exists.
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
  relaunchMock.mockResolvedValue(undefined);
  downloadAndInstallMock.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

it("renders nothing when there is no update", async () => {
  checkMock.mockResolvedValue(null);

  const { container } = render(<UpdateBanner />);

  await vi.waitFor(() => {
    expect(checkMock).toHaveBeenCalled();
  });
  expect(container).toBeEmptyDOMElement();
});

it("says so when the check fails instead of looking up to date", async () => {
  checkMock.mockRejectedValue(new Error("404"));

  render(<UpdateBanner />);

  expect(await screen.findByText(/Update check failed/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Update & restart/ })).not.toBeInTheDocument();
});

it("announces an available update", async () => {
  checkMock.mockResolvedValue(availableUpdate());

  render(<UpdateBanner />);

  expect(await screen.findByText(/ArtyDog 0.2.0 is available/)).toBeInTheDocument();
});

it("installs and relaunches", async () => {
  checkMock.mockResolvedValue(availableUpdate());

  render(<UpdateBanner />);
  fireEvent.click(await screen.findByRole("button", { name: /Update & restart/ }));

  await vi.waitFor(() => {
    expect(downloadAndInstallMock).toHaveBeenCalled();
    expect(relaunchMock).toHaveBeenCalled();
  });
});

it("reports a failed install instead of restarting", async () => {
  checkMock.mockResolvedValue(availableUpdate());
  downloadAndInstallMock.mockRejectedValue(new Error("network gone"));

  render(<UpdateBanner />);
  fireEvent.click(await screen.findByRole("button", { name: /Update & restart/ }));

  expect(await screen.findByText(/network gone/)).toBeInTheDocument();
  expect(relaunchMock).not.toHaveBeenCalled();
});

it("dismissing hides the banner", async () => {
  checkMock.mockResolvedValue(availableUpdate());

  render(<UpdateBanner />);
  fireEvent.click(await screen.findByRole("button", { name: "Not now" }));

  expect(screen.queryByText(/is available/)).not.toBeInTheDocument();
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

  render(<UpdateBanner />);
  fireEvent.click(await screen.findByRole("button", { name: /Update & restart/ }));

  expect(await screen.findByText(/25%/)).toBeInTheDocument();
});
