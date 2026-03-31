"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const isPdf = useMemo(() => {
    try {
      const u = new URL(receiptUrl, window.location.origin);
      return u.pathname.toLowerCase().endsWith(".pdf");
    } catch {
      return receiptUrl.toLowerCase().split("?")[0].endsWith(".pdf");
    }
  }, [receiptUrl]);

  useEffect(() => {
    if (!open) return;
    setIsZoomed(false);
  }, [open, receiptUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70"
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
        {isPdf ? (
          <div className="w-full max-w-md rounded-xl bg-white/5 border border-white/10 p-4 text-center text-white">
            <p className="text-sm text-white/80 mb-3">Bu fiş PDF formatında.</p>
            <Button asChild variant="secondary">
              <a href={receiptUrl} target="_blank" rel="noreferrer">
                PDF’i Aç
              </a>
            </Button>
          </div>
        ) : (
          <img
            src={receiptUrl}
            alt="Fiş"
            onClick={() => setIsZoomed((z) => !z)}
            className={[
              "rounded-lg object-contain shadow-lg select-none",
              isZoomed ? "max-w-none max-h-none" : "max-w-full max-h-[90vh]",
              isZoomed ? "cursor-zoom-out" : "cursor-zoom-in",
            ].join(" ")}
            style={{
              touchAction: "pinch-zoom",
              transform: isZoomed ? "scale(1.5)" : undefined,
              transformOrigin: "center center",
              transition: "transform 180ms ease",
            }}
          />
        )}
      </div>
    </div>
  );
}
