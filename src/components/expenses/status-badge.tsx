"use client";

import { Badge } from "@/components/ui/badge";
import type { ExpenseStatus } from "@/types";
import { useLang } from "@/contexts/LanguageContext";
import { t, type TranslationKey } from "@/lib/i18n";

const VARIANTS: Record<
  ExpenseStatus,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  pending_bolge: "warning",
  pending_koord: "secondary",
  approved_bolge: "secondary",
  rejected_bolge: "destructive",
  approved_koord: "success",
  rejected_koord: "destructive",
  paid: "success",
  deleted: "destructive",
};

const STATUS_KEYS: Record<ExpenseStatus, TranslationKey> = {
  pending_bolge: "status_pending_bolge",
  pending_koord: "status_pending_koord",
  approved_bolge: "status_approved_bolge",
  rejected_bolge: "status_rejected_bolge",
  approved_koord: "status_approved_koord",
  rejected_koord: "status_rejected_koord",
  paid: "status_paid",
  deleted: "misc_deleted",
};

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  const { lang } = useLang();
  const key = STATUS_KEYS[status];
  const label = key ? t(key, lang) : status;
  return (
    <Badge variant={VARIANTS[status]} className="shrink-0">
      {label}
    </Badge>
  );
}
