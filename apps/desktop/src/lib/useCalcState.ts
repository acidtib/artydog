import { useCallback, useEffect, useState } from "react";
import { emptyCalcState } from "../calculator/derive";
import type { CalcState } from "../calculator/types";
import {
  getCalcState,
  onCalcStateChanged,
  setCalcState,
} from "./calculatorState";

export interface UseCalcState {
  calc: CalcState;
  updateCalc: (next: CalcState) => void;
  error: string | null;
}

/// Rust owns the state; this hook is the window's mirror. Edits are
/// optimistic so typing never lags, and the event echo reconciles both
/// windows through one path.
export function useCalcState(): UseCalcState {
  const [calc, setCalc] = useState<CalcState>(emptyCalcState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const unlistenPromise = onCalcStateChanged((next) => {
      if (!disposed) setCalc(next);
    });

    unlistenPromise.catch((e: unknown) => {
      if (!disposed) {
        setError(String(e));
      }
    });

    getCalcState()
      .then((initial) => {
        if (!disposed) {
          setCalc(initial);
        }
      })
      .catch((e: unknown) => {
        if (!disposed) {
          setError(String(e));
        }
      });

    return () => {
      disposed = true;
      void unlistenPromise
        .then((unlisten) => unlisten())
        .catch(() => {});
    };
  }, []);

  const updateCalc = useCallback((next: CalcState) => {
    setCalc(next);
    setCalcState(next)
      .then(() => setError(null))
      .catch((e: unknown) => setError(String(e)));
  }, []);

  return { calc, updateCalc, error };
}
