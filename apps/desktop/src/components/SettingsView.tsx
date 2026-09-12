import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getHotkeyStatus,
  getOverlayState,
  onOverlayVisibilityChanged,
  resetOverlayGeometry,
  setHotkey,
  toggleOverlay,
  type HotkeyStatus,
} from "../lib/overlay";
import { shortcutFromEvent, shortcutLabel } from "../lib/shortcut";
import type { UseUpdateCheck } from "../lib/useUpdateCheck";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pt-4">
      <h3 className="mb-1 px-4 text-[11px] font-medium uppercase tracking-tight text-neutral-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[34px] items-center justify-between border-b border-tool-hairline px-4">
      {children}
    </div>
  );
}

function ActionRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[36px] items-center justify-end gap-2 border-b border-tool-hairline px-4">
      {children}
    </div>
  );
}

export default function SettingsView({ updater }: { updater: UseUpdateCheck }) {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [hotkey, setHotkeyStatus] = useState<HotkeyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const captureButton = useRef<HTMLButtonElement>(null);
  // Rust emits an event per show/hide; the count tells a stale reply from a current one.
  const eventCount = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void onOverlayVisibilityChanged((status) => {
      eventCount.current += 1;
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
        if (eventCount.current === 0) {
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
    const seen = eventCount.current;
    try {
      const status = await toggleOverlay();
      // An event that landed while the command was in flight already told us
      // the newer state; only fall back to the reply when none did.
      if (eventCount.current === seen) {
        setVisible(status.visible);
      }
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

  useEffect(() => {
    if (capturing) {
      captureButton.current?.focus();
    }
  }, [capturing]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // A bubbled Escape would close the whole settings dialog.
      event.preventDefault();
      event.stopPropagation();
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
          setHotkeyStatus(await setHotkey(shortcut));
          setError(null);
        } catch (e) {
          setError(String(e));
        }
      })();
    },
    [],
  );

  return (
    <main className="flex-1 overflow-y-auto pb-3">
      <Section title="Overlay">
        <Row>
          <span className="shrink-0 text-[13px] text-neutral-400">Overlay status</span>
          <span className="flex items-center gap-2 text-[13px] text-neutral-300">
            {visible === null ? "…" : visible ? "Visible" : "Hidden"}
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                visible ? "bg-emerald-500" : "bg-neutral-700"
              }`}
            />
          </span>
        </Row>
        <ActionRow>
          <button
            type="button"
            onClick={() => void onReset()}
            className="px-2 py-1 text-xs text-neutral-400 transition-colors hover:text-white"
          >
            Reset position
          </button>
          <button
            type="button"
            onClick={() => void onToggle()}
            className="rounded-[4px] border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
          >
            {visible ? "Hide overlay" : "Show overlay"}
          </button>
        </ActionRow>
      </Section>

      <Section title="Shortcut">
        <Row>
          <span className="shrink-0 text-[13px] text-neutral-400">Toggle overlay</span>
          <span className="flex min-w-0 items-center gap-1.5">
            {hotkey !== null &&
              shortcutLabel(hotkey.shortcut)
                .split(" + ")
                .map((key) => (
                  <kbd
                    key={key}
                    className="min-w-[20px] shrink-0 rounded-[4px] border border-b-2 border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-center font-mono text-[10px] text-neutral-200"
                  >
                    {key}
                  </kbd>
                ))}
            {hotkey !== null && !hotkey.registered && (
              <span className="ml-1 shrink-0 text-xs text-red-400">not registered</span>
            )}
            {hotkey !== null && hotkey.error !== null && (
              <span className="min-w-0 truncate text-xs text-red-400" title={hotkey.error}>
                {hotkey.error}
              </span>
            )}
          </span>
        </Row>
        <ActionRow>
          <button
            ref={captureButton}
            type="button"
            onClick={() => setCapturing(true)}
            onKeyDown={capturing ? onKeyDown : undefined}
            onBlur={() => setCapturing(false)}
            className={`rounded-[4px] border px-3 py-1 text-xs font-medium transition-colors ${
              capturing
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                : "border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
            }`}
          >
            {capturing ? "Press keys… Esc cancels" : "Record"}
          </button>
        </ActionRow>
      </Section>

      <Section title="General">
        {updater.update !== null && !updater.dismissed ? (
          <>
            <Row>
              <span className="shrink-0 text-[13px] text-neutral-400">Update</span>
              <span className="truncate text-[13px] text-neutral-300">
                ArtyDog {updater.update.version} is available.
              </span>
            </Row>
            <ActionRow>
              {updater.installing ? (
                <span className="text-xs text-neutral-400">
                  {updater.percent === null
                    ? "Downloading…"
                    : `Downloading… ${updater.percent}%`}
                </span>
              ) : (
                <>
                  {updater.error !== null && (
                    <span className="mr-auto truncate text-xs text-red-400">
                      {updater.error}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={updater.dismiss}
                    className="shrink-0 px-3 py-1 text-xs font-medium text-neutral-400 transition-colors hover:text-white"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={updater.install}
                    className="shrink-0 rounded-[4px] border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-neutral-700"
                  >
                    Update &amp; restart
                  </button>
                </>
              )}
            </ActionRow>
          </>
        ) : (
          <ActionRow>
            {updater.error !== null ? (
              <span className="mr-auto truncate text-xs text-red-400">
                {updater.error}
              </span>
            ) : updater.note !== null ? (
              <span className="mr-auto truncate text-xs text-neutral-500">
                {updater.note}
              </span>
            ) : null}
            <button
              type="button"
              onClick={updater.checkNow}
              className="shrink-0 px-3 py-1 text-xs font-medium text-neutral-400 transition-colors hover:text-white"
            >
              Check for updates
            </button>
          </ActionRow>
        )}
      </Section>

      {error !== null && (
        <p
          role="alert"
          className="mt-3 border-y border-red-500/20 bg-red-500/[0.07] px-4 py-2 text-xs leading-snug text-red-400"
        >
          {error}
        </p>
      )}
    </main>
  );
}
