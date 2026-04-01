"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ShortcutRole } from "@/hooks/useKeyboardShortcuts";

const COMMON = [
  { key: "?", desc: "Bu paneli aç/kapat" },
  { key: "ESC", desc: "Açık modalı kapat" },
];

const BY_ROLE: Record<ShortcutRole, { title: string; items: { key: string; desc: string }[] }[]> = {
  deneyap: [
    { title: "Genel", items: COMMON },
    { title: "Harcamalar", items: [{ key: "N", desc: "Yeni harcama" }, { key: "H", desc: "Harcamalarım" }] },
  ],
  il: [
    { title: "Genel", items: COMMON },
    { title: "Harcamalar", items: [{ key: "N", desc: "Yeni harcama" }, { key: "H", desc: "Harcamalar" }] },
  ],
  bolge: [
    { title: "Genel", items: COMMON },
    { title: "Navigasyon", items: [{ key: "N", desc: "Yeni harcama" }, { key: "J / K", desc: "Sonraki / önceki harcama" }] },
    { title: "Onay (detay açıkken)", items: [{ key: "A", desc: "Onayla" }, { key: "R", desc: "Reddet" }] },
  ],
  koordinator: [
    { title: "Genel", items: COMMON },
    { title: "Onay (detay açıkken)", items: [{ key: "A", desc: "Onayla" }, { key: "R", desc: "Reddet" }] },
  ],
  muhasebe: [
    { title: "Genel", items: COMMON },
    { title: "Ödeme", items: [{ key: "P", desc: "Ödendi işaretle" }] },
  ],
  yk: [{ title: "Genel", items: COMMON }],
  admin: [
    { title: "Genel", items: COMMON },
    { title: "Kısayollar", items: [{ key: "U", desc: "Kullanıcılar" }, { key: "L", desc: "Loglar" }] },
  ],
};

export function KeyboardShortcutsPanel({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: ShortcutRole;
}) {
  useEffect(() => {
    const onEsc = () => onOpenChange(false);
    window.addEventListener("tamga:escape", onEsc as any);
    return () => window.removeEventListener("tamga:escape", onEsc as any);
  }, [onOpenChange]);

  const groups = BY_ROLE[role] ?? [{ title: "Genel", items: COMMON }];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] rounded-2xl shadow-sm">
        <DialogHeader>
          <DialogTitle>⌨️ Klavye Kısayolları</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{g.title}</div>
              <div className="grid gap-2">
                {g.items.map((it) => (
                  <div key={it.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <span className="font-mono text-xs text-slate-700 rounded bg-slate-100 px-2 py-1">{it.key}</span>
                    <span className="text-sm text-slate-700">{it.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

