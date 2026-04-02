"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useExpensesRealtime } from "@/lib/realtime-expenses";
import type { Expense } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ApprovalModal } from "@/components/approval/approval-modal";
import { formatCurrency, formatDate, formatDateLong } from "@/lib/utils";
import { EXPENSE_FIELDS_FULL } from "@/lib/expense-fields";
import { Clock, CheckCircle, Download, Eye, EyeOff, FileImage, X, Check } from "lucide-react";
import { toast } from "sonner";
import { notifyApi } from "@/lib/notify-api";
import { cn } from "@/lib/utils";
import { useHighlightExpense } from "@/lib/use-highlight-expense";
import { ReceiptLightbox } from "@/components/expenses/receipt-lightbox";

function maskIban(iban: string): string {
  if (!iban || iban.length < 12) return iban;
  const s = iban.replace(/\s/g, "");
  return s.slice(0, 4) + " **** **** **** **" + s.slice(-4);
}

type DatePreset = "week" | "month" | "lastMonth" | "custom";

function getPresetRange(preset: DatePreset, customStart: string, customEnd: string): { start: Date; end: Date } {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  if (preset === "week") {
    const day = now.getDay();
    const monday = day === 0 ? -6 : 1 - day;
    start.setDate(now.getDate() + monday);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (preset === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (preset === "lastMonth") {
    start.setMonth(now.getMonth() - 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setDate(0); // son gün önceki ay
    end.setHours(23, 59, 59, 999);
  } else {
    start = customStart ? new Date(customStart + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
    end = customEnd ? new Date(customEnd + "T23:59:59") : new Date();
  }
  return { start, end };
}

export default function MuhasebePage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"awaiting" | "paid" | "export">("awaiting");
  const highlight = useHighlightExpense();
  const searchParams = useSearchParams();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [bulkMarking, setBulkMarking] = useState(false);
  const [showIbanIds, setShowIbanIds] = useState<Set<string>>(new Set());
  const [selectedAwaitingIds, setSelectedAwaitingIds] = useState<Set<string>>(new Set());
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [confirmBulkAwaiting, setConfirmBulkAwaiting] = useState(false);
  const [confirmBulkExport, setConfirmBulkExport] = useState(false);
  const [receiptModal, setReceiptModal] = useState<{
    url: string;
    expenseNumber: string;
    name: string;
    amount: number;
    aiAnalysis: string | null;
  } | null>(null);
  const [lastExport, setLastExport] = useState<{ end_date: string; export_date: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "awaiting" || t === "paid" || t === "export") setActiveTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (highlight) setActiveTab("awaiting");
  }, [highlight]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setStart(today);
    setEnd(today);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("export_logs")
        .select("end_date, export_date")
        .eq("exported_by", user.id)
        .order("export_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      const row = data as { end_date: string; export_date: string } | null;
      setLastExport(row ?? null);
      if (row?.end_date) {
        const nextDay = new Date(row.end_date);
        nextDay.setDate(nextDay.getDate() + 1);
        setStart(nextDay.toISOString().slice(0, 10));
      } else {
        const first = new Date();
        first.setDate(1);
        setStart(first.toISOString().slice(0, 10));
      }
      setEnd(new Date().toISOString().slice(0, 10));
    })();
  }, [supabase]);

  const refetch = useCallback(async () => {
    let data: unknown = null;
    let error: any = null;

    // Prefer excluding archived expenses, but be resilient if DB isn't migrated yet.
    const res = await supabase
      .from("expenses")
      .select(EXPENSE_FIELDS_FULL)
      .in("status", ["approved_koord", "paid"])
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    data = res.data;
    error = res.error;

    if (error?.code === "42703" && String(error?.message ?? "").includes("archived_at")) {
      const res2 = await supabase
        .from("expenses")
        .select(EXPENSE_FIELDS_FULL)
        .in("status", ["approved_koord", "paid"])
        .order("created_at", { ascending: false });
      data = res2.data;
      error = res2.error;
    }
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[muhasebe] expenses refetch", {
        rows: Array.isArray(data) ? data.length : null,
        error,
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[muhasebe] expenses refetch error", error);
      }
    }
    setExpenses((data ?? []) as Expense[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useExpensesRealtime(supabase, { filter: null, refetch });

  const awaiting = expenses.filter((e) => e.status === "approved_koord");
  const paid = expenses.filter((e) => e.status === "paid");

  const { start: exportStart, end: exportEnd } = useMemo(
    () => getPresetRange(datePreset, start, end),
    [datePreset, start, end]
  );
  const exportList = useMemo(
    () =>
      expenses.filter((e) => {
        const d = new Date(e.created_at);
        return d >= exportStart && d <= exportEnd && ["approved_koord", "paid"].includes(e.status);
      }),
    [expenses, exportStart, exportEnd]
  );
  const exportSummary = useMemo(() => {
    const people = new Set(exportList.map((e) => e.submitter_id)).size;
    const total = exportList.reduce((s, e) => s + Number(e.amount), 0);
    return { people, total };
  }, [exportList]);

  const allExportSelected = exportList.length > 0 && selectedExportIds.size === exportList.length;
  const allAwaitingSelected = awaiting.length > 0 && selectedAwaitingIds.size === awaiting.length;

  function toggleIban(id: string) {
    setShowIbanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExportSelect(id: string) {
    setSelectedExportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAwaitingSelect(id: string) {
    setSelectedAwaitingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAllExportSelected(checked: boolean) {
    if (checked) setSelectedExportIds(new Set(exportList.map((e) => e.id)));
    else setSelectedExportIds(new Set());
  }

  function setAllAwaitingSelected(checked: boolean) {
    if (checked) setSelectedAwaitingIds(new Set(awaiting.map((e) => e.id)));
    else setSelectedAwaitingIds(new Set());
  }

  async function handleMarkPaid(expense: Expense) {
    setMarkingId(expense.id);
    try {
      await supabase.from("expenses").update({ status: "paid" }).eq("id", expense.id);
      fetch("/api/system-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "expense_approved",
          target_type: "expense",
          target_id: expense.id,
          details: { expense_number: expense.expense_number, amount: expense.amount, submitter_name: (expense as any).submitter_name, by: "muhasebe_paid" },
        }),
      }).catch(() => {});
      setExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? { ...e, status: "paid" as const } : e))
      );
      // Personele bildirim: ödeme yapıldı
      notifyApi({
        recipientId: expense.submitter_id,
        recipientRole: (expense as any).submitter_role ?? "deneyap",
        expenseId: expense.id,
        message: `[${expense.expense_number}] ödemeniz gerçekleşti.`,
        pushTitle: "TAMGA - Ödeme Yapıldı 🎉",
        pushBody: `${expense.expense_number} numaralı harcamanız ödendi`,
        pushUrl: "/dashboard/deneyap",
      });
      toast.success("Ödendi olarak işaretlendi.");
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setMarkingId(null);
    }
  }

  async function handleBulkMarkPaid(ids: string[]) {
    const toMark = ids.filter((id) => {
      const e = expenses.find((x) => x.id === id);
      return e?.status === "approved_koord";
    });
    if (toMark.length === 0) {
      toast.error("Seçili kayıtlar arasında ödenecek harcama yok.");
      return;
    }
    setBulkMarking(true);
    setConfirmBulkAwaiting(false);
    setConfirmBulkExport(false);
    try {
      const expenseById = new Map(expenses.map((e) => [e.id, e]));

      const { error } = await supabase
        .from("expenses")
        .update({ status: "paid" })
        .in("id", toMark);
      if (error) throw error;

      const toNotify = toMark
        .map((id) => expenseById.get(id))
        .filter(Boolean) as Expense[];

      await Promise.all(
        toNotify.flatMap((expense) => [
          fetch("/api/system-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "expense_approved",
              target_type: "expense",
              target_id: expense.id,
              details: {
                expense_number: expense.expense_number,
                amount: expense.amount,
                by: "muhasebe_paid",
              },
            }),
          }).catch(() => {}),
          // Personele bildirim: ödeme yapıldı
          Promise.resolve(
            notifyApi({
              recipientId: expense.submitter_id,
              recipientRole: (expense as any).submitter_role ?? "deneyap",
              expenseId: expense.id,
              message: `[${expense.expense_number}] ödemeniz gerçekleşti.`,
              pushTitle: "TAMGA - Ödeme Yapıldı 🎉",
              pushBody: `${expense.expense_number} numaralı harcamanız ödendi`,
              pushUrl: "/dashboard/deneyap",
            })
          ),
        ])
      );
      setExpenses((prev) =>
        prev.map((e) => (toMark.includes(e.id) ? { ...e, status: "paid" as const } : e))
      );
      setSelectedAwaitingIds((prev) => {
        const next = new Set(prev);
        toMark.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedExportIds((prev) => {
        const next = new Set(prev);
        toMark.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(`${toMark.length} harcama ödendi olarak işaretlendi.`);
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setBulkMarking(false);
    }
  }

  async function handleExportExcel() {
    const ids = Array.from(selectedExportIds);
    if (ids.length === 0) {
      toast.error("En az bir kayıt seçin.");
      return;
    }
    const url = `/api/export-excel?ids=${ids.join(",")}`;
    window.open(url, "_blank");
    if (userId) {
      await supabase.from("export_logs").insert({
        exported_by: userId,
        start_date: exportStart.toISOString().slice(0, 10),
        end_date: exportEnd.toISOString().slice(0, 10),
        record_count: ids.length,
      });
      setLastExport({
        end_date: exportEnd.toISOString().slice(0, 10),
        export_date: new Date().toISOString(),
      });
    }
    toast.success("Excel indiriliyor...");
  }

  const showList = activeTab !== "export";
  const selectedAwaitingForPay = awaiting.filter((e) => selectedAwaitingIds.has(e.id));
  const selectedExportForPay = exportList.filter((e) => e.status === "approved_koord" && selectedExportIds.has(e.id));

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-24">
        <h1 className="text-lg font-semibold text-slate-800 mb-4">Muhasebe</h1>

        {/* Export sekmesi — tamamen ayrı içerik */}
        {activeTab === "export" && (
          <div className="space-y-4">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h2 className="text-base font-semibold text-slate-800">Ödeme Dönemi Seç</h2>
                <div className="flex flex-wrap gap-2">
                  {(["week", "month", "lastMonth", "custom"] as const).map((key) => (
                    <Button
                      key={key}
                      variant={datePreset === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDatePreset(key)}
                    >
                      {key === "week" ? "Bu Hafta" : key === "month" ? "Bu Ay" : key === "lastMonth" ? "Geçen Ay" : "Özel"}
                    </Button>
                  ))}
                </div>
                {datePreset === "custom" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Başlangıç</Label>
                      <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bitiş</Label>
                      <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" />
                    </div>
                  </div>
                )}
                <p className="text-sm text-slate-600">
                  {exportSummary.people} kişi · {formatCurrency(exportSummary.total)} toplam
                </p>
                {lastExport && (
                  <p className="text-xs text-slate-500">
                    Son export: {formatDateLong(lastExport.end_date)} · O tarihten bugüne {exportList.length} yeni ödeme
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <p className="text-xs font-medium text-slate-500 px-3 py-2 bg-slate-50 border-b">Önizleme</p>
              <div className="max-h-64 overflow-auto">
                {exportList.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500 text-center">Seçili dönemde kayıt yok.</p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={allExportSelected}
                        onChange={(e) => setAllExportSelected(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-600">Tümünü seç</span>
                    </label>
                    <ul>
                      {exportList.map((e) => (
                        <li key={e.id} className="border-b border-slate-100 last:border-0">
                          <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={selectedExportIds.has(e.id)}
                              onChange={() => toggleExportSelect(e.id)}
                              className="rounded border-slate-300"
                            />
                            <span className="flex-1 truncate text-sm font-medium text-slate-800">{e.submitter_name}</span>
                            <span className="text-xs text-slate-500 shrink-0">{e.expense_number}</span>
                            <span className="text-sm font-semibold text-slate-800 shrink-0">{formatCurrency(e.amount)}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleExportExcel}
                disabled={selectedExportIds.size === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 h-11"
              >
                <Download className="h-4 w-4 mr-2" /> Excel İndir ↓
              </Button>
              <Button
                onClick={() => selectedExportForPay.length > 0 && setConfirmBulkExport(true)}
                disabled={selectedExportForPay.length === 0 || bulkMarking}
                variant="default"
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-11"
              >
                <Check className="h-4 w-4 mr-2" /> Tümünü Ödendi İşaretle ✓
              </Button>
            </div>
          </div>
        )}

        {/* Bekleyenler / Ödenenler — üstte export kartı sadece bu sekmelerde yok, doğrudan liste */}
        {showList && (
          <>
            {activeTab === "awaiting" && (
              <div className="space-y-2">
                {awaiting.length > 0 && (
                  <label className="flex items-center gap-2 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allAwaitingSelected}
                      onChange={(e) => setAllAwaitingSelected(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-600">Tümünü Seç</span>
                  </label>
                )}
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
                  ))
                ) : awaiting.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center">
                    <p className="text-slate-600 font-medium">Henüz harcama yok</p>
                    <p className="text-sm text-slate-400 mt-1">Ödeme bekleyen harcama bulunmuyor.</p>
                  </div>
                ) : (
                  awaiting.map((e) => (
                    <Card key={e.id} data-expense-id={e.id} className="rounded-xl shadow-sm overflow-hidden">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedAwaitingIds.has(e.id)}
                              onChange={() => toggleAwaitingSelect(e.id)}
                              className="rounded border-slate-300 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">{e.submitter_name}</p>
                              <p className="text-xs text-slate-500">{e.expense_number} · {formatDate(e.created_at)}</p>
                            </div>
                          </label>
                          <p className="text-lg font-bold text-slate-800 shrink-0">{formatCurrency(e.amount)}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap pl-6">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-mono text-slate-500 truncate">
                              {showIbanIds.has(e.id) ? e.iban : maskIban(e.iban)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleIban(e.id)}
                              className="p-0.5 rounded text-slate-400 hover:text-slate-600 shrink-0"
                              aria-label={showIbanIds.has(e.id) ? "IBAN gizle" : "IBAN göster"}
                            >
                              {showIbanIds.has(e.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {e.receipt_url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs shrink-0"
                              onClick={() => setReceiptModal({ url: e.receipt_url!, expenseNumber: e.expense_number, name: e.submitter_name, amount: e.amount, aiAnalysis: e.ai_analysis })}
                            >
                              <FileImage className="h-3.5 w-3.5 mr-1" /> Fişi Gör
                            </Button>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700 h-9"
                          onClick={() => handleMarkPaid(e)}
                          disabled={!!markingId}
                        >
                          {markingId === e.id ? "İşleniyor..." : "Ödendi İşaretle"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {activeTab === "paid" && (
              <div className="space-y-2">
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
                  ))
                ) : paid.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center">
                    <p className="text-slate-600 font-medium">Henüz kayıt yok</p>
                    <p className="text-sm text-slate-400 mt-1">Ödenen harcama bulunmuyor.</p>
                  </div>
                ) : (
                  paid.map((e) => (
                    <Card key={e.id} data-expense-id={e.id} className="rounded-xl shadow-sm overflow-hidden">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-semibold text-slate-800">{e.submitter_name}</p>
                            <p className="text-xs text-slate-500">{e.expense_number} · {formatDate(e.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold text-slate-800">{formatCurrency(e.amount)}</p>
                            <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white shrink-0">Ödendi</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-mono text-slate-500 truncate">
                              {showIbanIds.has(e.id) ? e.iban : maskIban(e.iban)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleIban(e.id)}
                              className="p-0.5 rounded text-slate-400 hover:text-slate-600 shrink-0"
                              aria-label={showIbanIds.has(e.id) ? "IBAN gizle" : "IBAN göster"}
                            >
                              {showIbanIds.has(e.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {e.receipt_url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs shrink-0"
                              onClick={() => setReceiptModal({ url: e.receipt_url!, expenseNumber: e.expense_number, name: e.submitter_name, amount: e.amount, aiAnalysis: e.ai_analysis })}
                            >
                              <FileImage className="h-3.5 w-3.5 mr-1" /> Fişi Gör
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Sticky bar — Bekleyenler'de seçili varsa */}
        {activeTab === "awaiting" && selectedAwaitingIds.size > 0 && (
          <div className="fixed bottom-20 left-0 right-0 max-w-[430px] mx-auto px-4 z-20">
            <div className="rounded-xl bg-slate-800 text-white p-3 shadow-lg flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{selectedAwaitingIds.size} seçili</span>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 shrink-0"
                onClick={() => setConfirmBulkAwaiting(true)}
                disabled={bulkMarking}
              >
                <Check className="h-4 w-4 mr-1" /> Seçilileri Ödendi İşaretle
              </Button>
            </div>
          </div>
        )}
      </div>

      <BottomNav
        tabs={[
          { id: "awaiting", label: "Bekleyenler", icon: Clock, badge: awaiting.length > 0 ? awaiting.length : undefined },
          { id: "paid", label: "Ödenenler", icon: CheckCircle },
          { id: "export", label: "Export", icon: Download },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "awaiting" | "paid" | "export")}
      />

      <ApprovalModal
        open={confirmBulkAwaiting}
        onOpenChange={setConfirmBulkAwaiting}
        title="Ödendi işaretle"
        description={`Seçili ${selectedAwaitingIds.size} harcamayı ödendi olarak işaretlemek istiyor musunuz? Bu işlem geri alınamaz.`}
        confirmLabel="Evet, işaretle"
        onConfirm={() => handleBulkMarkPaid(Array.from(selectedAwaitingIds))}
        loading={bulkMarking}
      />
      <ApprovalModal
        open={confirmBulkExport}
        onOpenChange={setConfirmBulkExport}
        title="Ödendi işaretle"
        description={`Seçili ${selectedExportForPay.length} harcamayı ödendi olarak işaretlemek istiyor musunuz? Bu işlem geri alınamaz.`}
        confirmLabel="Evet, işaretle"
        onConfirm={() => handleBulkMarkPaid(selectedExportForPay.map((e) => e.id))}
        loading={bulkMarking}
      />

      {receiptModal && (
        <ReceiptLightbox
          open={!!receiptModal}
          onClose={() => setReceiptModal(null)}
          receiptUrl={receiptModal.url}
          bolgeNote={null}
        />
      )}
    </div>
  );
}
