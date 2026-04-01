"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/expenses/status-badge";
import { REGION_LIMIT_SLUGS } from "@/lib/region-names";
import { regionToTurkish } from "@/lib/region-names";
import type { ExpenseStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { FileImage, FileText, Shield } from "lucide-react";
import { useHighlightExpense } from "@/lib/use-highlight-expense";
import { ReceiptLightbox } from "@/components/expenses/receipt-lightbox";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "pending_bolge", label: "Bölge bekliyor" },
  { value: "pending_koord", label: "TÇK bekliyor" },
  { value: "approved_bolge", label: "Bölge onaylı" },
  { value: "approved_koord", label: "Koord. onaylı" },
  { value: "paid", label: "Ödendi" },
  { value: "rejected_bolge", label: "Red (bölge)" },
  { value: "rejected_koord", label: "Red (koord)" },
  { value: "deleted", label: "Silindi" },
];

type ExpenseRow = {
  id: string;
  expense_number: string;
  submitter_name: string;
  il: string | null;
  bolge: string | null;
  receipt_url?: string | null;
  amount: number;
  status: ExpenseStatus;
  expense_type: string;
  kategori_detay?: unknown | null;
  created_at: string;
};

function formatKategoriDetay(expense: ExpenseRow): string | null {
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

export default function AdminHarcamalarPage() {
  useHighlightExpense();
  const [list, setList] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ExpenseRow | null>(null);
  const [receiptLightbox, setReceiptLightbox] = useState<{ url: string } | null>(null);
  const [tab, setTab] = useState<"aktif" | "arsiv">("aktif");
  const [statusFilter, setStatusFilter] = useState("");
  const [bolgeFilter, setBolgeFilter] = useState("");
  const [ilFilter, setIlFilter] = useState("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ExpenseStatus>("pending_bolge");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab === "arsiv") params.set("archived", "only");
    if (statusFilter) params.set("status", statusFilter);
    if (bolgeFilter) params.set("bolge", bolgeFilter);
    if (ilFilter) params.set("il", ilFilter);
    if (q.trim()) params.set("q", q.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (amountMin !== "") params.set("amountMin", amountMin);
    if (amountMax !== "") params.set("amountMax", amountMax);
    params.set("sort", sort);
    params.set("order", order);
    const res = await fetch(`/api/admin/expenses?${params}`);
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, [tab, statusFilter, bolgeFilter, sort, order]);

  const handleChangeStatus = async () => {
    if (!detail || !reason.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/expenses/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, reason: reason.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setDetail((d) => (d ? { ...d, status: newStatus } : null));
      setChangeStatusOpen(false);
      setReason("");
      fetchList();
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    const res = await fetch(`/api/admin/expenses/${detail.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setDetail(null);
      setDeleteConfirm(false);
      fetchList();
    }
  };

  const handleRestore = async () => {
    if (!detail) return;
    const res = await fetch(`/api/admin/expenses/${detail.id}/restore`, { method: "POST" });
    if (res.ok) {
      setDetail(null);
      setDeleteConfirm(false);
      fetchList();
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Tüm Harcamalar</h1>
      <div className="flex gap-2">
        <Button variant={tab === "aktif" ? "default" : "outline"} onClick={() => setTab("aktif")}>
          Aktif
        </Button>
        <Button variant={tab === "arsiv" ? "default" : "outline"} onClick={() => setTab("arsiv")}>
          Arşiv
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Durum</Label>
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value || "all"} value={o.value || "all"}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bölge</Label>
          <Select value={bolgeFilter || "all"} onValueChange={(v) => setBolgeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Bölge" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {REGION_LIMIT_SLUGS.map((s) => (
                <SelectItem key={s} value={s}>
                  {regionToTurkish(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Kişi ara"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-[120px]"
        />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px]" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px]" />
        <Button variant="secondary" onClick={fetchList}>
          Filtrele
        </Button>
      </div>
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-700">No</th>
                  <th className="text-left p-3 font-medium text-slate-700">Kişi</th>
                  <th className="text-left p-3 font-medium text-slate-700">İl / Bölge</th>
                  <th className="text-left p-3 font-medium text-slate-700">Tutar</th>
                  <th className="text-left p-3 font-medium text-slate-700">Durum</th>
                  <th className="text-left p-3 font-medium text-slate-700">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr
                    key={e.id}
                    data-expense-id={e.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setDetail(e)}
                  >
                    <td className="p-3 font-medium">{e.expense_number}</td>
                    <td className="p-3">{e.submitter_name || "—"}</td>
                    <td className="p-3 text-slate-600">
                      {e.il ?? "—"} / {e.bolge ? regionToTurkish(e.bolge) : "—"}
                    </td>
                    <td className="p-3">{formatCurrency(e.amount)}</td>
                    <td className="p-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="p-3 text-slate-500 text-xs">
                      {new Date(e.created_at).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={() => { setDetail(null); setDeleteConfirm(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.expense_number}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Kişi:</span> {detail.submitter_name}</p>
              <p><span className="font-medium">İl / Bölge:</span> {detail.il ?? "—"} / {detail.bolge ? regionToTurkish(detail.bolge) : "—"}</p>
              <p><span className="font-medium">Tutar:</span> {formatCurrency(detail.amount)}</p>
              {formatKategoriDetay(detail) && (
                <p><span className="font-medium">Ek Bilgiler:</span> {formatKategoriDetay(detail)}</p>
              )}
              <p><span className="font-medium">Durum:</span> <StatusBadge status={detail.status} /></p>
              <p><span className="font-medium">Tarih:</span> {new Date(detail.created_at).toLocaleString("tr-TR")}</p>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {detail?.receipt_url && (
              <Button
                variant="outline"
                onClick={() => setReceiptLightbox({ url: detail.receipt_url! })}
              >
                <FileImage className="h-4 w-4 mr-2" /> Fişi Gör
              </Button>
            )}
            {tab === "aktif" && (
              <Button
                variant="outline"
                onClick={() => {
                  setNewStatus(detail?.status ?? "pending_bolge");
                  setChangeStatusOpen(true);
                }}
              >
                Durumu Değiştir
              </Button>
            )}
            <Button
              variant={tab === "arsiv" ? "default" : "destructive"}
              onClick={tab === "arsiv" ? handleRestore : handleDelete}
              disabled={tab === "arsiv" ? false : deleting}
              className="flex items-center gap-1"
            >
              <Shield className="h-4 w-4" />
              {tab === "arsiv" ? "Arşivden Geri Al" : deleteConfirm ? "Emin misiniz? Tekrar tıklayın" : "Arşivle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeStatusOpen} onOpenChange={setChangeStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Durumu Değiştir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Yeni durum</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ExpenseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Değişiklik nedeni *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Değişiklik nedenini yazın..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeStatusOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleChangeStatus}
              disabled={saving || !reason.trim()}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptLightbox
        open={!!receiptLightbox}
        onClose={() => setReceiptLightbox(null)}
        receiptUrl={receiptLightbox?.url ?? ""}
        bolgeNote={null}
      />
    </div>
  );
}
