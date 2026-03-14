"use client";

import { X } from "lucide-react";

export function ReceiptLightbox({
  open,
  onClose,
  receiptUrl,
  bolgeNote,
}: {
  open: boolean;
  onClose: () => void;
  receiptUrl: string;
  bolgeNote: string | null;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Fiş önizleme"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
        aria-label="Kapat"
      >
        <X className="h-6 w-6" />
      </button>
      <div
        className="flex-1 overflow-auto flex flex-col items-center justify-center p-4 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {bolgeNote && (
          <div className="w-full max-w-md mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 shadow-sm">
            <p className="font-medium text-amber-900 mb-1">Bölge sorumlusu notu</p>
            <p>{bolgeNote}</p>
          </div>
        )}
        <img
          src={receiptUrl}
          alt="Fiş"
          className="max-w-full h-auto max-h-[85vh] rounded-lg object-contain shadow-lg"
        />
      </div>
    </div>
  );
}
