import { useCallback, useEffect, useRef, useState } from "react";
import { setHotkey, type HotkeyStatus } from "../lib/overlay";
import { shortcutFromEvent, shortcutLabel } from "../lib/shortcut";

interface Props {
  status: HotkeyStatus;
  onChange: (status: HotkeyStatus) => void;
}

export default function HotkeySetting({ status, onChange }: Props) {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (capturing) {
      button.current?.focus();
    }
  }, [capturing]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Swallow everything while capturing, or Escape and Tab would leave
      // instead of being offered as the shortcut.
      event.preventDefault();
      if (event.key === "Escape") {
        setCapturing(false);
        return;
      }
      const shortcut = shortcutFromEvent(event);
      if (shortcut === null) {
        return;
      }
      setCapturing(false);
      void (async () => {
        try {
          onChange(await setHotkey(shortcut));
          setError(null);
        } catch (e) {
          setError(String(e));
        }
      })();
    },
    [onChange],
  );

  return (
    <div className="mt-1">
      <p className="text-sm text-neutral-400">
        Toggle shortcut:{" "}
        <span className="font-semibold text-neutral-200">
          {shortcutLabel(status.shortcut)}
        </span>
        {!status.registered && <span className="text-red-400"> - NOT registered</span>}
      </p>
      {status.error !== null && (
        <p className="mt-1 text-sm text-red-400">{status.error}</p>
      )}
      {error !== null && <p className="mt-1 text-sm text-red-400">{error}</p>}
      <button
        ref={button}
        type="button"
        onClick={() => setCapturing(true)}
        onKeyDown={capturing ? onKeyDown : undefined}
        onBlur={() => setCapturing(false)}
        className="mt-2 rounded bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
      >
        {capturing ? "Press a key combination…" : "Change shortcut"}
      </button>
    </div>
  );
}
