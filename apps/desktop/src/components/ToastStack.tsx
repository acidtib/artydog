import type { Toast } from "../lib/useToasts";

interface ToastStackProps {
  toasts: readonly Toast[];
  onDismiss: (id: number) => void;
}

/// Stacked above the footer, newest last. Each one is dismissible, so a long
/// message can be cleared without waiting it out.
export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex flex-col gap-1.5">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          role="alert"
          title="Dismiss"
          onClick={() => onDismiss(toast.id)}
          className="pointer-events-auto rounded-[4px] border border-red-500/30 bg-[#2a1416] px-3 py-2 text-left text-xs leading-snug text-red-300 shadow-lg shadow-black/40 transition-colors hover:border-red-500/50"
        >
          {toast.text}
        </button>
      ))}
    </div>
  );
}
