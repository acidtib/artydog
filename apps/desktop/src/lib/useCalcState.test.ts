import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { emptyCalcState } from "../calculator/derive";
import type { CalcState } from "../calculator/types";
import { useCalcState } from "./useCalcState";

const getCalcStateMock = vi.fn();
const setCalcStateMock = vi.fn();
const onCalcStateChangedMock = vi.fn();
const unlistenMock = vi.fn();

vi.mock("./calculatorState", () => ({
  getCalcState: (...args: unknown[]) => getCalcStateMock(...args),
  setCalcState: (...args: unknown[]) => setCalcStateMock(...args),
  onCalcStateChanged: (...args: unknown[]) => onCalcStateChangedMock(...args),
}));

let listener: (calc: CalcState) => void = () => {};

function state(overrides: Partial<CalcState>): CalcState {
  return { ...emptyCalcState(), ...overrides };
}

beforeEach(() => {
  getCalcStateMock.mockReset();
  setCalcStateMock.mockReset();
  onCalcStateChangedMock.mockReset().mockImplementation((handler) => {
    listener = handler;
    return Promise.resolve(unlistenMock);
  });
  unlistenMock.mockClear();
});

afterEach(() => {
  cleanup();
});

it("starts empty and mirrors the state fetched on mount", async () => {
  getCalcStateMock.mockResolvedValue(state({ weaponId: "mortar" }));

  const { result } = renderHook(() => useCalcState());

  expect(result.current.calc).toEqual(emptyCalcState());
  await waitFor(() =>
    expect(result.current.calc.weaponId).toBe("mortar"),
  );
  expect(result.current.error).toBeNull();
});

it("replaces local state when the other window writes", async () => {
  getCalcStateMock.mockResolvedValue(emptyCalcState());
  const { result } = renderHook(() => useCalcState());
  await waitFor(() => expect(getCalcStateMock).toHaveBeenCalled());

  await act(async () => {
    listener(state({ artilleryX: "50" }));
  });

  expect(result.current.calc.artilleryX).toBe("50");
});

it("applies an edit locally before the write completes", async () => {
  getCalcStateMock.mockResolvedValue(emptyCalcState());
  setCalcStateMock.mockReturnValue(new Promise(() => {}));
  const next = state({ artilleryX: "12" });

  const { result } = renderHook(() => useCalcState());
  await waitFor(() => expect(getCalcStateMock).toHaveBeenCalled());

  act(() => {
    result.current.updateCalc(next);
  });

  expect(result.current.calc).toEqual(next);
  expect(setCalcStateMock).toHaveBeenCalledWith(next);
});

it("surfaces a failed write and clears the error on the next success", async () => {
  getCalcStateMock.mockResolvedValue(emptyCalcState());
  const { result } = renderHook(() => useCalcState());
  await waitFor(() => expect(getCalcStateMock).toHaveBeenCalled());

  setCalcStateMock.mockRejectedValue(new Error("ipc down"));
  act(() => {
    result.current.updateCalc(state({ artilleryX: "12" }));
  });
  await waitFor(() => expect(result.current.error).not.toBeNull());

  setCalcStateMock.mockResolvedValue(state({ artilleryX: "14" }));
  act(() => {
    result.current.updateCalc(state({ artilleryX: "14" }));
  });
  await waitFor(() => expect(result.current.error).toBeNull());
});

it("surfaces a failed initial fetch", async () => {
  getCalcStateMock.mockRejectedValue(new Error("ipc down"));

  const { result } = renderHook(() => useCalcState());

  await waitFor(() => expect(result.current.error).not.toBeNull());
  expect(result.current.calc).toEqual(emptyCalcState());
});

it("surfaces a failed listener registration", async () => {
  onCalcStateChangedMock.mockRejectedValue(new Error("ipc down"));
  getCalcStateMock.mockResolvedValue(emptyCalcState());

  const { result } = renderHook(() => useCalcState());

  await waitFor(() => expect(result.current.error).not.toBeNull());
  expect(result.current.calc).toEqual(emptyCalcState());
});

it("stops listening on unmount", async () => {
  getCalcStateMock.mockResolvedValue(emptyCalcState());

  const { unmount } = renderHook(() => useCalcState());
  await waitFor(() => expect(getCalcStateMock).toHaveBeenCalled());

  unmount();

  await waitFor(() => expect(unlistenMock).toHaveBeenCalled());
});
