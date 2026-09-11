import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { CalcState } from "../calculator/types";

/// Must match CALC_STATE_EVENT in src-tauri/src/commands.rs.
export const CALC_STATE_EVENT = "calc-state-changed";

export async function getCalcState(): Promise<CalcState> {
  return invoke<CalcState>("get_calc_state");
}

export async function setCalcState(calc: CalcState): Promise<CalcState> {
  return invoke<CalcState>("set_calc_state", { calc });
}

export function onCalcStateChanged(
  handler: (calc: CalcState) => void,
): Promise<UnlistenFn> {
  return listen<CalcState>(CALC_STATE_EVENT, (event) =>
    handler(event.payload),
  );
}
