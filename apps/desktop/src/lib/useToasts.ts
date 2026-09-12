import { useCallback, useEffect, useRef, useState } from "react";

export interface Toast {
  id: number;
  text: string;
}

/// One toast per failure, so a later error is never hidden behind an earlier one.
export function useToasts(lifetimeMs = 6000) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);

    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (text: string) => {
      const id = nextId.current;
      nextId.current += 1;

      setToasts((current) => [...current, { id, text }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), lifetimeMs),
      );
    },
    [dismiss, lifetimeMs],
  );

  // A timer that fires after unmount would set state on a gone component.
  useEffect(() => {
    const pending = timers.current;

    return () => {
      for (const timer of pending.values()) {
        clearTimeout(timer);
      }
      pending.clear();
    };
  }, []);

  return { toasts, push, dismiss };
}

/// Clearing the error leaves its toast to age out on its own.
export function useErrorToast(
  error: string | null,
  push: (text: string) => void,
) {
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (error !== null && error !== previous.current) {
      push(error);
    }
    previous.current = error;
  }, [error, push]);
}
