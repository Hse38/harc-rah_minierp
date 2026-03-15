"use client";

import { useState } from "react";
import type { Expense } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/expenses/status-badge";
import { ReceiptLightbox } from "@/components/expenses/receipt-lightbox";
import { formatCurrency, formatDate, bolgeAdi } from "@/lib/utils";
import { ChevronRight, FileImage } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending_bolge: "Bölge Onayı Bekleniyor",
  pending_koord: "TÇK Onayı Bekleniyor",
  approved_bolge: "Koordinatör Onayı Bekleniyor",
  rejected_bolge: "Reddedildi (bölge)",
  approved_koord: "Onaylandı",
  rejected_koord: "Reddedildi (koordinatör)",
  paid: "Ödendi",
};

export function YkExpenseDetailModal({
  expense,
  open,
  onOpenChange,
}: {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [receiptLightboxOpen, setReceiptLightboxOpen] = useState(false);

  if (!expense) return null;

  const timeline: { label: string; date: string | null }[] = [
    { label: "Başvuru oluşturuldu", date: expense.created_at },
    {
      label: "Bölge onayı",
      date: expense.reviewed_at_bolge ?? (["rejected_bolge", "approved_bolge"].includes(expense.status) ? null : null),
    },
    {
      label: "Koordinatör onayı",
      date: expense.reviewed_at_koord ?? (["approved_koord", "rejected_koord", "paid"].includes(expense.status) ? null : null),
    },
    { label: "Ödeme", date: expense.status === "paid" ? expense.reviewed_at_koord ?? expense.created_at : null },
  ].filter((t) => t.date !== undefined);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[430px] rounded-2xl shadow-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800">{expense.expense_number}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Başvuran</span>
              <span className="font-medium">{expense.submitter_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">IBAN</span>
              <span className="font-mono text-xs break-all text-right max-w-[60%]">{expense.iban}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">İl / Bölge</span>
              <span>{expense.il} · {bolgeAdi(expense.bolge)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tür</span>
              <span>{expense.expense_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tutar</span>
              <span className="font-semibold text-slate-800">{formatCurrency(expense.amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Durum</span>
              <StatusBadge status={expense.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tarih</span>
              <span>{formatDate(expense.created_at)}</span>
            </div>
            {expense.description && (
              <div>
                <span className="text-slate-500 block mb-1">Açıklama</span>
                <p className="text-slate-700">{expense.description}</p>
              </div>
            )}
            {expense.bolge_note && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium text-amber-900 mb-1">Bölge notu</p>
                <p>{expense.bolge_note}</p>
              </div>
            )}
            {/* Onay geçmişi */}
            <div>
              <span className="text-slate-500 block mb-2">Onay geçmişi</span>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <div>
                    <p className="font-medium text-slate-700">Başvuru oluşturuldu</p>
                    <p className="text-xs text-slate-500">{formatDate(expense.created_at)}</p>
                  </div>
                </li>
                {expense.reviewed_at_bolge && (
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400 mt-0.5">•</span>
                    <div>
                      <p className="font-medium text-slate-700">Bölge onayı</p>
                      <p className="text-xs text-slate-500">{formatDate(expense.reviewed_at_bolge)}</p>
                    </div>
                  </li>
                )}
                {expense.reviewed_at_koord && (
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400 mt-0.5">•</span>
                    <div>
                      <p className="font-medium text-slate-700">Koordinatör onayı</p>
                      <p className="text-xs text-slate-500">{formatDate(expense.reviewed_at_koord)}</p>
                    </div>
                  </li>
                )}
                {expense.status === "paid" && (
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400 mt-0.5">•</span>
                    <div>
                      <p className="font-medium text-slate-700">Ödendi</p>
                      <p className="text-xs text-slate-500">{expense.reviewed_at_koord ? formatDate(expense.reviewed_at_koord) : "—"}</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
            {/* Fiş */}
            <div>
              <span className="text-slate-500 block mb-1">Fiş</span>
              {expense.receipt_url ? (
                <button
                  type="button"
                  onClick={() => setReceiptLightboxOpen(true)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-center gap-2 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <FileImage className="h-5 w-5" />
                  <span>Fişi tam ekranda görüntüle</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-slate-500 text-sm">
                  Fiş yüklenmemiş
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptLightbox
        open={receiptLightboxOpen}
        onClose={() => setReceiptLightboxOpen(false)}
        receiptUrl={expense.receipt_url ?? ""}
        bolgeNote={null}
      />
    </>
  );
}
