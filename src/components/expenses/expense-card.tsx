import Link from "next/link";
import { useState } from "react";
import type { Expense } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileImage, Receipt, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptLightbox } from "@/components/expenses/receipt-lightbox";
import { ExpenseContextMenu } from "@/components/ExpenseContextMenu";

const TYPE_ICONS: Record<string, string> = {
  Yakıt: "⛽",
  Ulaşım: "🚗",
  Konaklama: "🏨",
  Yemek: "🍽️",
  Malzeme: "📦",
  Diğer: "📋",
};

function getKategoriDetaySummary(expense: Expense): string | null {
  const kd = expense.kategori_detay as any;
  if (!kd || typeof kd !== "object") return null;

  const amount = Number(expense.amount);
  const safeDiv = (unit: number) => (unit > 0 ? amount / unit : null);

  if (expense.expense_type === "Yakıt") {
    const km = Number(kd.km);
    if (!Number.isFinite(km) || km <= 0) return null;
    const per = safeDiv(km);
    return `${km} KM${per ? ` · ${formatCurrency(per)}/km` : ""}`;
  }
  if (expense.expense_type === "Yemek") {
    const kisi = Number(kd.kisi_sayisi);
    if (!Number.isFinite(kisi) || kisi <= 0) return null;
    const per = safeDiv(kisi);
    return `${kisi} kişi${per ? ` · ${formatCurrency(per)}/kişi` : ""}`;
  }
  if (expense.expense_type === "Konaklama") {
    const gece = Number(kd.gece_sayisi);
    if (!Number.isFinite(gece) || gece <= 0) return null;
    const per = safeDiv(gece);
    return `${gece} gece${per ? ` · ${formatCurrency(per)}/gece` : ""}`;
  }
  if (expense.expense_type === "Ulaşım") {
    const tip = kd.tip === "bilet" ? "bilet" : kd.tip === "km" ? "km" : null;
    const deger = Number(kd.deger);
    if (!tip || !Number.isFinite(deger) || deger <= 0) return null;
    const per = safeDiv(deger);
    const label = tip === "km" ? "KM" : "bilet";
    return `${deger} ${label}${per ? ` · ${formatCurrency(per)}/${tip}` : ""}`;
  }
  if (expense.expense_type === "Diğer") {
    const a = String(kd.aciklama ?? "").trim();
    return a ? `Ne için? ${a}` : null;
  }
  return null;
}

export function ExpenseCard({
  expense,
  href,
  showSubmitter = false,
  actions,
  deputyLabel,
}: {
  expense: Expense;
  href?: string;
  showSubmitter?: boolean;
  actions?: React.ReactNode;
  deputyLabel?: string;
}) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const detailSummary = getKategoriDetaySummary(expense);

  const content = (
    <Card data-expense-id={expense.id} className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {expense.bolge_warning && expense.bolge_note && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">{expense.bolge_note}</p>
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800">
                {expense.expense_number}
              </span>
              <StatusBadge status={expense.status} />
              {expense.manuel_giris && (
                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[11px] font-medium">
                  Manuel Girildi
                </span>
              )}
              {expense.eski_fis && (
                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[11px] font-medium">
                  Eski Fiş
                </span>
              )}
              {deputyLabel && (
                <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[11px] font-medium">
                  {deputyLabel}
                </span>
              )}
            </div>
            {showSubmitter && (
              <p className="text-sm text-slate-600 mt-0.5">
                {expense.submitter_name}
                {expense.il && ` · ${expense.il}`}
              </p>
            )}
            <p className="text-sm text-slate-500 mt-1">
              {TYPE_ICONS[expense.expense_type] ?? "•"} {expense.expense_type} ·{" "}
              {formatDate(expense.created_at)}
            </p>
            {detailSummary && (
              <p className="text-xs text-slate-500 mt-1">{detailSummary}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold text-slate-900">
              {formatCurrency(expense.amount)}
            </p>
            {expense.receipt_url && (
              <Receipt className="h-4 w-4 text-slate-400 inline-block mt-1" />
            )}
          </div>
        </div>
        {expense.description && (
          <p className="text-xs text-slate-500 mt-2 line-clamp-2">
            {expense.description}
          </p>
        )}
        {expense.receipt_url && (
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setReceiptOpen(true);
              }}
            >
              <FileImage className="h-3.5 w-3.5 mr-1.5" />
              Fişi Gör
            </Button>
          </div>
        )}
        {actions && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <>
        <ExpenseContextMenu expense={expense} detailUrl={href}>
          <Link href={href}>{content}</Link>
        </ExpenseContextMenu>
        {expense.receipt_url && (
          <ReceiptLightbox
            open={receiptOpen}
            onClose={() => setReceiptOpen(false)}
            receiptUrl={expense.receipt_url}
            bolgeNote={expense.bolge_note}
          />
        )}
      </>
    );
  }
  return (
    <>
      <ExpenseContextMenu expense={expense}>{content}</ExpenseContextMenu>
      {expense.receipt_url && (
        <ReceiptLightbox
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          receiptUrl={expense.receipt_url}
          bolgeNote={expense.bolge_note}
        />
      )}
    </>
  );
}
