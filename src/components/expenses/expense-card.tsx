import Link from "next/link";
import { useState } from "react";
import type { Expense } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileImage, Receipt, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptLightbox } from "@/components/expenses/receipt-lightbox";

const TYPE_ICONS: Record<string, string> = {
  Ulaşım: "🚗",
  Konaklama: "🏨",
  Yemek: "🍽️",
  Malzeme: "📦",
  Diğer: "📋",
};

export function ExpenseCard({
  expense,
  href,
  showSubmitter = false,
  actions,
}: {
  expense: Expense;
  href?: string;
  showSubmitter?: boolean;
  actions?: React.ReactNode;
}) {
  const [receiptOpen, setReceiptOpen] = useState(false);

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
        <Link href={href}>{content}</Link>
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
      {content}
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
