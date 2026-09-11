import { useCallback, useEffect, useRef, useState } from "react";
import HotkeySetting from "./HotkeySetting";
import {
  getHotkeyStatus,
  getOverlayState,
  onOverlayVisibilityChanged,
  resetOverlayGeometry,
  toggleOverlay,
  type HotkeyStatus,
} from "../lib/overlay";

export default function OverlayControls() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [hotkey, setHotkeyStatus] = useState<HotkeyStatus | null>(null);
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
        setHotkeyStatus(hotkeyStatus);
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

  const onReset = useCallback(async () => {
    try {
      await resetOverlayGeometry();
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
      {hotkey !== null && <HotkeySetting status={hotkey} onChange={setHotkeyStatus} />}
      {error !== null && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => void onToggle()}
          className="rounded bg-neutral-700 px-4 py-2 text-sm font-semibold hover:bg-neutral-600"
        >
          Toggle Overlay
        </button>
        <button
          type="button"
          onClick={() => void onReset()}
          className="rounded bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
        >
          Reset Position
        </button>
      </div>
    </div>
  );
}
