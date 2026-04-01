"use client";

import { useEffect } from "react";

export type ShortcutRole =
  | "deneyap"
  | "il"
  | "bolge"
  | "koordinator"
  | "muhasebe"
  | "yk"
  | "admin";

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts({
  role,
  onToggleHelp,
}: {
  role: ShortcutRole;
  onToggleHelp: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) return;
      const key = e.key;

      if (key === "?") {
        e.preventDefault();
        onToggleHelp();
        return;
      }
      if (key === "Escape") {
        window.dispatchEvent(new CustomEvent("tamga:escape"));
        return;
      }

      const upper = key.length === 1 ? key.toUpperCase() : key;
      const go = (url: string) => {
        e.preventDefault();
        window.location.href = url;
      };

      if (role === "deneyap") {
        if (upper === "N") return go("/dashboard/deneyap/yeni");
        if (upper === "H") return go("/dashboard/deneyap?tab=list");
      }
      if (role === "il") {
        if (upper === "N") return go("/dashboard/il/yeni");
        if (upper === "H") return go("/dashboard/il?tab=list");
      }
      if (role === "bolge") {
        if (upper === "N") return go("/dashboard/bolge/yeni");
        if (upper === "J") return window.dispatchEvent(new CustomEvent("tamga:nextExpense"));
        if (upper === "K") return window.dispatchEvent(new CustomEvent("tamga:prevExpense"));
        if (upper === "A") return window.dispatchEvent(new CustomEvent("tamga:approve"));
        if (upper === "R") return window.dispatchEvent(new CustomEvent("tamga:reject"));
      }
      if (role === "koordinator") {
        if (upper === "A") return window.dispatchEvent(new CustomEvent("tamga:approve"));
        if (upper === "R") return window.dispatchEvent(new CustomEvent("tamga:reject"));
      }
      if (role === "muhasebe") {
        if (upper === "P") return window.dispatchEvent(new CustomEvent("tamga:markPaid"));
      }
      if (role === "admin") {
        if (upper === "U") return go("/dashboard/admin/kullanicilar");
        if (upper === "L") return go("/dashboard/admin/loglar");
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onToggleHelp, role]);
}

