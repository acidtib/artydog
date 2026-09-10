import { useCallback, useEffect, useState } from "react";
import { getHotkeyStatus, getOverlayState, toggleOverlay, type HotkeyStatus } from "./lib/overlay";

export default function App() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [hotkey, setHotkey] = useState<HotkeyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [status, hotkeyStatus] = await Promise.all([getOverlayState(), getHotkeyStatus()]);
      setVisible(status.visible);
      setHotkey(hotkeyStatus);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const onToggle = useCallback(async () => {
    try {
      const status = await toggleOverlay();
      setVisible(status.visible);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <div className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-bold">WARDOGS Mortar Calculator</h1>
        <p className="mt-4 text-sm text-neutral-300">
          Overlay status: {visible === null ? "…" : visible ? "Visible" : "Hidden"}
        </p>
        <p className="mt-1 text-sm text-neutral-400">Press M to toggle the overlay.</p>
        {hotkey !== null && (
          <p className="mt-1 text-sm text-neutral-400">
            Hotkey &quot;{hotkey.shortcut}&quot;:{" "}
            {hotkey.registered ? "registered" : "NOT registered"}
            {hotkey.error !== null && <span className="text-red-400"> — {hotkey.error}</span>}
          </p>
        )}
        {error !== null && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={() => void onToggle()}
          className="mt-6 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
        >
          Toggle Overlay
        </button>
      </div>
    </div>
  );
}
