import { useCallback, useEffect, useState } from "react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

export default function UpdateBanner() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const found = await check();
        if (!cancelled && found !== null) {
          setUpdate(found);
        }
      } catch {
        // Until the first stable release exists the endpoint 404s, and an
        // offline launch fails the same way. Neither is worth a banner.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onInstall = useCallback(async () => {
    if (update === null) {
      return;
    }
    let downloaded = 0;
    let total = 0;
    setPercent(0);
    try {
      await update.downloadAndInstall((progress) => {
        switch (progress.event) {
          case "Started":
            total = progress.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += progress.data.chunkLength;
            setPercent(total > 0 ? Math.round((downloaded / total) * 100) : null);
            break;
          case "Finished":
            setPercent(100);
            break;
        }
      });
      await relaunch();
    } catch (e) {
      // The user asked for this one, so a failure has to be visible.
      setError(String(e));
      setPercent(null);
    }
  }, [update]);

  if (update === null || dismissed) {
    return null;
  }

  const installing = percent !== null;

  return (
    <div className="mt-6 rounded border border-emerald-800 bg-emerald-950 p-4">
      <p className="text-sm text-emerald-100">
        ArtyDog {update.version} is available.
      </p>
      {error !== null && <p className="mt-2 text-sm text-red-400">{error}</p>}
      {installing ? (
        <p className="mt-3 text-sm text-emerald-200">Downloading… {percent}%</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void onInstall()}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500"
          >
            Update &amp; restart
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
          >
            Not now
          </button>
        </div>
      )}
    </div>
  );
}
