import { beforeEach, expect, it, vi } from "vitest";
import {
  getCalcState,
  onCalcStateChanged,
  setCalcState,
} from "./calculatorState";

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

const SAMPLE = {
  weaponId: "mortar",
  mortarX: "50",
  mortarY: "50",
  targetX: "53",
  targetY: "54",
};

beforeEach(() => {
  invokeMock.mockReset();
  listenMock.mockReset();
});

it("getCalcState invokes get_calc_state", async () => {
  invokeMock.mockResolvedValue(SAMPLE);

  const calc = await getCalcState();

  expect(invokeMock).toHaveBeenCalledWith("get_calc_state");
  expect(calc).toEqual(SAMPLE);
});

it("setCalcState invokes set_calc_state with the full state", async () => {
  invokeMock.mockResolvedValue(SAMPLE);

  const calc = await setCalcState(SAMPLE);

  expect(invokeMock).toHaveBeenCalledWith("set_calc_state", { calc: SAMPLE });
  expect(calc).toEqual(SAMPLE);
});

it("onCalcStateChanged subscribes to the Rust event and unwraps the payload", async () => {
  const unlisten = vi.fn();
  listenMock.mockResolvedValue(unlisten);
  const handler = vi.fn();

  const dispose = await onCalcStateChanged(handler);

  expect(listenMock).toHaveBeenCalledWith(
    "calc-state-changed",
    expect.any(Function),
  );

  const listener = listenMock.mock.calls[0][1] as (event: {
    payload: unknown;
  }) => void;
  listener({ payload: SAMPLE });

  expect(handler).toHaveBeenCalledWith(SAMPLE);

  dispose();
  expect(unlisten).toHaveBeenCalled();
});
