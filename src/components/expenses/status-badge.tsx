import { Badge } from "@/components/ui/badge";
import type { ExpenseStatus } from "@/types";

const LABELS: Record<ExpenseStatus, string> = {
  pending_bolge: "Bölge Onayı Bekleniyor",
  pending_koord: "TÇK Onayı Bekleniyor",
  approved_bolge: "Koordinatör Onayı Bekleniyor",
  rejected_bolge: "Reddedildi",
  approved_koord: "Onaylandı",
  rejected_koord: "Reddedildi",
  paid: "Ödendi",
};

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
};

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <Badge variant={VARIANTS[status]} className="shrink-0">
      {LABELS[status]}
    </Badge>
  );
}
