import { beforeEach, expect, it, vi } from "vitest";
import {
  getOverlayGeometry,
  onOverlayVisibilityChanged,
  setOverlayPosition,
  setOverlaySize,
} from "./overlay";

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

beforeEach(() => {
  invokeMock.mockReset();
  listenMock.mockReset();
});

it("setOverlayPosition invokes set_overlay_position with x and y", async () => {
  invokeMock.mockResolvedValue({ x: 10, y: 20, width: 400, height: 300 });

  const geometry = await setOverlayPosition(10, 20);

  expect(invokeMock).toHaveBeenCalledWith("set_overlay_position", {
    x: 10,
    y: 20,
  });
  expect(geometry).toEqual({ x: 10, y: 20, width: 400, height: 300 });
});

it("setOverlaySize invokes set_overlay_size with width and height", async () => {
  invokeMock.mockResolvedValue({ x: 0, y: 0, width: 800, height: 600 });

  const geometry = await setOverlaySize(800, 600);

  expect(invokeMock).toHaveBeenCalledWith("set_overlay_size", {
    width: 800,
    height: 600,
  });
  expect(geometry).toEqual({ x: 0, y: 0, width: 800, height: 600 });
});

it("getOverlayGeometry invokes get_overlay_geometry", async () => {
  invokeMock.mockResolvedValue({ x: 1, y: 2, width: 3, height: 4 });

  const geometry = await getOverlayGeometry();

  expect(invokeMock).toHaveBeenCalledWith("get_overlay_geometry");
  expect(geometry).toEqual({ x: 1, y: 2, width: 3, height: 4 });
});

it("onOverlayVisibilityChanged subscribes to the Rust event and unwraps the payload", async () => {
  const unlisten = vi.fn();
  listenMock.mockResolvedValue(unlisten);
  const handler = vi.fn();

  const dispose = await onOverlayVisibilityChanged(handler);

  expect(listenMock).toHaveBeenCalledWith(
    "overlay-visibility",
    expect.any(Function),
  );

  const listener = listenMock.mock.calls[0][1] as (event: {
    payload: unknown;
  }) => void;
  listener({ payload: { visible: true } });
  listener({ payload: { visible: false } });

  expect(handler).toHaveBeenCalledTimes(2);
  expect(handler).toHaveBeenNthCalledWith(1, { visible: true });
  expect(handler).toHaveBeenNthCalledWith(2, { visible: false });

  dispose();
  expect(unlisten).toHaveBeenCalled();
});
