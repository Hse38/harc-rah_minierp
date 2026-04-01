"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { Expense } from "@/types";

type MenuItem = { id: string; label: string; onClick: () => void };

export function ExpenseContextMenu({
  expense,
  children,
  detailUrl,
}: {
  expense: Expense;
  detailUrl?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const longPressTimer = useRef<number | null>(null);

  const items: MenuItem[] = useMemo(() => {
    const out: MenuItem[] = [];
    if (detailUrl) out.push({ id: "view", label: "👁️ Detayı Gör", onClick: () => (window.location.href = detailUrl) });
    if (expense.receipt_url) out.push({ id: "receipt", label: "🧾 Fişi Görüntüle", onClick: () => window.dispatchEvent(new CustomEvent("tamga:openReceipt", { detail: { id: expense.id } })) });
    out.push({
      id: "copy",
      label: "📋 HRC Numarasını Kopyala",
      onClick: async () => {
        await navigator.clipboard.writeText(expense.expense_number);
        toast.success(`📋 ${expense.expense_number} kopyalandı`);
      },
    });
    return out;
  }, [detailUrl, expense.id, expense.expense_number, expense.receipt_url]);

  useEffect(() => {
    if (!open) return;
    const onDown = () => setOpen(false);
    const onEsc = () => setOpen(false);
    window.addEventListener("scroll", onDown, true);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("tamga:escape", onEsc as any);
    return () => {
      window.removeEventListener("scroll", onDown, true);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("tamga:escape", onEsc as any);
    };
  }, [open]);

  const menu = open
    ? createPortal(
        <div
          className="fixed z-[9999] min-w-[220px] rounded-xl border border-slate-200 bg-white shadow-lg p-1"
          style={{
            left: Math.min(pos.x, window.innerWidth - 240),
            top: Math.min(pos.y, window.innerHeight - 180),
          }}
        >
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className="w-full text-left rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          setPos({ x: e.clientX, y: e.clientY });
          setOpen(true);
        }}
        onTouchStart={(e) => {
          if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
          const t = window.setTimeout(() => {
            const touch = e.touches?.[0];
            if (!touch) return;
            setPos({ x: touch.clientX, y: touch.clientY });
            setOpen(true);
          }, 500);
          longPressTimer.current = t;
        }}
        onTouchEnd={() => {
          if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }}
      >
        {children}
      </div>
      {menu}
    </>
  );
}

