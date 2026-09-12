import { useCallback, useState } from "react";
import OverlayCalculator from "./components/OverlayCalculator";
import ToastStack from "./components/ToastStack";
import { hideOverlay } from "./lib/overlay";
import { useCalcState } from "./lib/useCalcState";
import { useErrorToast, useToasts } from "./lib/useToasts";

export default function Overlay() {
  const { calc, updateCalc, error: calcError } = useCalcState();
  const [windowError, setWindowError] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  useErrorToast(calcError, push);
  useErrorToast(windowError, push);

  const onHide = useCallback(async () => {
    try {
      await hideOverlay();
      setWindowError(null);
    } catch (e) {
      setWindowError(String(e));
    }
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col bg-tool-base text-neutral-100">
      {/* The whole bar drags, so its labels must not swallow the press; the
          hide button is the one clickable exception. */}
      <div
        data-tauri-drag-region
        className="flex h-[30px] shrink-0 cursor-grab items-center justify-between border-b border-white/[0.08] bg-tool-raised px-3 select-none active:cursor-grabbing"
      >
        <div className="pointer-events-none flex items-center gap-2">
          <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300">
            ARTYDOG
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void onHide()}
          title="Hide Overlay"
          aria-label="Hide Overlay"
          className="flex items-center justify-center text-neutral-500 transition-colors hover:text-neutral-200"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <OverlayCalculator calc={calc} onChange={updateCalc} />
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
