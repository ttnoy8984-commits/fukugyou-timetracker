"use client";

export default function UndoToast({
  message, onUndo, onDismiss,
}: {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-center gap-4 max-w-[90vw]">
      <span className="truncate">{message}</span>
      <button
        onClick={onUndo}
        className="text-white font-medium underline underline-offset-2 hover:no-underline flex-shrink-0"
      >
        元に戻す
      </button>
      <button onClick={onDismiss} className="text-white/50 hover:text-white flex-shrink-0">
        ×
      </button>
    </div>
  );
}
