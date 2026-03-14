"use client";

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
import { formatCurrency, formatDate } from "@/lib/utils";

export function ExpenseDetailModal({
  expense,
  open,
  onOpenChange,
  showReceipt = true,
  showCloseButton = false,
}: {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** YK için fiş önizleme alanı (varsa görüntü, yoksa mesaj). Koordinatör tarafında kullanılmıyorsa false. */
  showReceipt?: boolean;
  /** Sadece "Kapat" butonu göster (YK: sadece görüntüleme). */
  showCloseButton?: boolean;
}) {
  if (!expense) return null;
  return (
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
            <span className="text-slate-500">İl / Bölge</span>
            <span>{expense.il} · {expense.bolge}</span>
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
          {showReceipt && (
            <div>
              <span className="text-slate-500 block mb-1">Fiş</span>
              {expense.receipt_url ? (
                <img
                  src={expense.receipt_url}
                  alt="Fiş"
                  className="w-full rounded-xl border border-slate-200 object-contain max-h-64 bg-slate-50"
                />
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-slate-500 text-sm">
                  Fiş yüklenmemiş
                </p>
              )}
            </div>
          )}
        </div>
        {showCloseButton && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
