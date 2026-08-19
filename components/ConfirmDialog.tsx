"use client";

export default function ConfirmDialog({
  title, message, confirmLabel = "削除する", onConfirm, onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          {message && <p className="text-xs text-ink-3 mt-1">{message}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 border border-line text-ink-2 text-sm font-medium py-3 rounded-xl hover:bg-tint transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-bad hover:bg-bad-strong text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
