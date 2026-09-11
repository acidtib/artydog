import { useCallback, useState } from "react";
import OverlayCalculator from "./components/OverlayCalculator";
import { hideOverlay } from "./lib/overlay";
import { startOverlayResize } from "./lib/window";
import { useCalcState } from "./lib/useCalcState";

export default function Overlay() {
  const { calc, updateCalc, error: calcError } = useCalcState();
  const [windowError, setWindowError] = useState<string | null>(null);

  const onHide = useCallback(async () => {
    try {
      await hideOverlay();
      setWindowError(null);
    } catch (e) {
      setWindowError(String(e));
    }
  }, []);

  const onResize = useCallback(async () => {
    try {
      await startOverlayResize();
      setWindowError(null);
    } catch (e) {
      setWindowError(String(e));
    }
  }, []);

  const error = calcError ?? windowError;

  return (
    <div className="relative h-screen w-screen bg-neutral-900 text-neutral-100">
      <div className="flex h-full flex-col">
        {/* The whole bar drags, so its labels must not swallow the press. */}
        <div
          data-tauri-drag-region
          className="flex cursor-grab items-baseline gap-2 border-b border-neutral-800 px-4 py-2 active:cursor-grabbing"
        >
          <h1 className="pointer-events-none text-lg font-bold tracking-wide">ARTYDOG</h1>
          <p className="pointer-events-none text-xs text-neutral-400">Overlay</p>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <OverlayCalculator calc={calc} onChange={updateCalc} />
          <button
            type="button"
            onClick={() => void onHide()}
            className="rounded bg-neutral-700 px-3 py-2 text-sm hover:bg-neutral-600"
          >
            Hide Overlay
          </button>
          {error !== null && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>

      <div
        role="button"
        tabIndex={-1}
        aria-label="Resize overlay"
        onMouseDown={() => void onResize()}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize border-b-2 border-r-2 border-neutral-600 hover:border-neutral-400"
      />
    </div>
  );
}
