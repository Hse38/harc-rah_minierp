"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { KeyboardShortcutsPanel } from "@/components/KeyboardShortcutsPanel";
import { useKeyboardShortcuts, type ShortcutRole } from "@/hooks/useKeyboardShortcuts";

export function KeyboardShortcutsRoot({ role }: { role: ShortcutRole }) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);

  useKeyboardShortcuts({
    role,
    onToggleHelp: () => setOpen((v) => !v),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "shortcuts_hint_shown";
    const shown = localStorage.getItem(key);
    if (!shown) {
      setHint(true);
      const t = window.setTimeout(() => setHint(false), 5000);
      localStorage.setItem(key, "1");
      return () => window.clearTimeout(t);
    }
  }, []);

  return (
    <>
      <div className="hidden md:flex fixed bottom-6 left-6 z-50 items-center gap-2">
        {hint && (
          <div className="animate-pulse rounded-full bg-slate-800 text-white text-xs px-3 py-1 shadow">
            Klavye kısayollarını keşfet →
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-10 w-10 rounded-full bg-white/90 shadow"
          onClick={() => setOpen(true)}
          aria-label="Klavye kısayolları"
          title="Klavye kısayolları (?)"
        >
          ?
        </Button>
      </div>

      <KeyboardShortcutsPanel open={open} onOpenChange={setOpen} role={role} />
    </>
  );
}

