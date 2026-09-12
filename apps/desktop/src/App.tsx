import { useCallback, useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import Calculator from "./components/Calculator";
import SettingsView from "./components/SettingsView";
import ToastStack from "./components/ToastStack";
import { useCalcState } from "./lib/useCalcState";
import { closeWindow, hideToTray } from "./lib/window";
import { useErrorToast, useToasts } from "./lib/useToasts";
import { useUpdateCheck } from "./lib/useUpdateCheck";

export default function App() {
  const { calc, updateCalc, error } = useCalcState();
  const updater = useUpdateCheck();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [windowError, setWindowError] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  useErrorToast(error, push);
  useErrorToast(windowError, push);

  useEffect(() => {
    let cancelled = false;

    getVersion()
      .then((found) => {
        if (!cancelled) {
          setVersion(found);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen]);

  const toggleSettings = useCallback(() => setSettingsOpen((open) => !open), []);
  const onMinimize = useCallback(() => {
    hideToTray().then(
      () => setWindowError(null),
      (e: unknown) => setWindowError(String(e)),
    );
  }, []);
  const onClose = useCallback(() => {
    closeWindow().then(
      () => setWindowError(null),
      (e: unknown) => setWindowError(String(e)),
    );
  }, []);

  const updateReady = updater.update !== null && !updater.dismissed;

  return (
    <div className="flex h-screen w-screen flex-col bg-tool-base text-neutral-300">
      {/* Undecorated, so this bar is the only way to move the window; the
          controls are the clickable exception. */}
      <header
        data-tauri-drag-region
        className="flex h-[30px] shrink-0 cursor-grab items-center border-b border-tool-hairline bg-tool-raised pl-3 select-none active:cursor-grabbing"
      >
        <h1 className="pointer-events-none text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300">
          ARTYDOG
        </h1>
        <div className="ml-auto flex h-full items-stretch">
          <button
            type="button"
            aria-label="Minimize"
            onClick={onMinimize}
            className="flex w-10 items-center justify-center text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-neutral-200"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex w-10 items-center justify-center text-neutral-500 transition-colors hover:bg-red-600 hover:text-white"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <main className="flex flex-1 flex-col overflow-y-auto">
          <Calculator calc={calc} onChange={updateCalc} />
        </main>

        {settingsOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className="absolute inset-0 flex flex-col bg-tool-base"
          >
            <div className="flex h-9 shrink-0 items-center border-b border-tool-hairline px-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-300">
                Settings
              </h2>
              <span className="ml-auto text-[10px] text-neutral-600">Esc to close</span>
            </div>
            <SettingsView updater={updater} />
          </div>
        )}

        {/* Last, so it stays above the settings dialog that covers this area. */}
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </div>

      <footer className="flex h-[33px] shrink-0 items-center justify-between border-t border-tool-hairline px-3 pb-px">
        <button
          type="button"
          aria-label="Settings"
          aria-pressed={settingsOpen}
          onClick={toggleSettings}
          className={`relative flex h-6 w-6 items-center justify-center rounded-[4px] transition-colors ${
            settingsOpen
              ? "bg-emerald-500/10 text-emerald-400"
              : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200"
          }`}
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {updateReady && (
            <span
              aria-label="Update available"
              className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-emerald-500"
            />
          )}
        </button>
        <span className="font-mono text-[11px] text-neutral-600">
          {version === "" ? "" : `v${version}`}
        </span>
      </footer>
    </div>
  );
}
