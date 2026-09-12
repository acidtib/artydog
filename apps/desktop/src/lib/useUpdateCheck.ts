import { useCallback, useEffect, useRef, useState } from "react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

export interface UseUpdateCheck {
  update: Update | null;
  note: string | null;
  error: string | null;
  percent: number | null;
  installing: boolean;
  dismissed: boolean;
  checkNow: () => void;
  dismiss: () => void;
  install: () => void;
}

/// Lives above the view switch so the launch check is not repeated and a
/// download in progress survives the user leaving the settings tab.
export function useUpdateCheck(): UseUpdateCheck {
  const [update, setUpdate] = useState<Update | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const disposed = useRef(false);
  const inFlight = useRef(false);

  const runCheck = useCallback(async (manual: boolean) => {
    setError(null);
    setNote(null);
    try {
      const found = await check();
      if (disposed.current) {
        return;
      }
      setUpdate(found);
      setDismissed(false);
      // The auto-check stays quiet when current; a manual check answers.
      if (found === null && manual) {
        setNote("Up to date");
      }
    } catch (e) {
      if (disposed.current) {
        return;
      }
      // Offline fails like a bad endpoint, so this is a note, not an error.
      setNote(`Update check failed: ${String(e)}`);
    }
  }, []);

  useEffect(() => {
    disposed.current = false;
    void runCheck(false);

    return () => {
      disposed.current = true;
    };
  }, [runCheck]);

  const install = useCallback(async () => {
    if (update === null || inFlight.current) {
      return;
    }
    inFlight.current = true;
    setInstalling(true);
    setPercent(0);
    let downloaded = 0;
    let total = 0;
    try {
      await update.downloadAndInstall((progress) => {
        switch (progress.event) {
          case "Started":
            total = progress.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += progress.data.chunkLength;
            // A server without Content-Length leaves the count indeterminate.
            setPercent(total > 0 ? Math.round((downloaded / total) * 100) : null);
            break;
          case "Finished":
            setPercent(100);
            break;
        }
      });
      await relaunch();
    } catch (e) {
      // Relaunch never returns on success, so only a failure reopens the button.
      inFlight.current = false;
      if (disposed.current) {
        return;
      }
      setInstalling(false);
      setPercent(null);
      setError(String(e));
    }
  }, [update]);

  return {
    update,
    note,
    error,
    percent,
    installing,
    dismissed,
    checkNow: useCallback(() => void runCheck(true), [runCheck]),
    dismiss: useCallback(() => setDismissed(true), []),
    install: useCallback(() => void install(), [install]),
  };
}
