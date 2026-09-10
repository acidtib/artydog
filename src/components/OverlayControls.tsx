import { useCallback, useEffect, useRef, useState } from "react";
import {
  getHotkeyStatus,
  getOverlayState,
  onOverlayVisibilityChanged,
  toggleOverlay,
  type HotkeyStatus,
} from "../lib/overlay";

export default function OverlayControls() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [hotkey, setHotkey] = useState<HotkeyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guards against a stale initial fetch clobbering an event that arrived
  // while the fetch was in flight.
  const eventSeen = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void onOverlayVisibilityChanged((status) => {
      eventSeen.current = true;
      setVisible(status.visible);
    })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
        }
      });

    void (async () => {
      try {
        const [status, hotkeyStatus] = await Promise.all([
          getOverlayState(),
          getHotkeyStatus(),
        ]);
        if (cancelled) {
          return;
        }
        if (!eventSeen.current) {
          setVisible(status.visible);
        }
        setHotkey(hotkeyStatus);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

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
    <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
      <p className="text-sm text-neutral-300">
        Overlay status: {visible === null ? "…" : visible ? "Visible" : "Hidden"}
      </p>
      <p className="mt-1 text-sm text-neutral-400">Press M to toggle the overlay.</p>
      {hotkey !== null && (
        <p className="mt-1 text-sm text-neutral-400">
          Hotkey &quot;{hotkey.shortcut}&quot;:{" "}
          {hotkey.registered ? "registered" : "NOT registered"}
          {hotkey.error !== null && <span className="text-red-400"> - {hotkey.error}</span>}
        </p>
      )}
      {error !== null && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={() => void onToggle()}
        className="mt-4 rounded bg-neutral-700 px-4 py-2 text-sm font-semibold hover:bg-neutral-600"
      >
        Toggle Overlay
      </button>
    </div>
  );
}
