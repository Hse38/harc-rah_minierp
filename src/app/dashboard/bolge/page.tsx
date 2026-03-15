"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useExpensesRealtime } from "@/lib/realtime-expenses";
import type { Expense } from "@/types";
import type { Profile } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/expenses/status-badge";
import { MetricCard } from "@/components/dashboard/metric-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ApprovalModal } from "@/components/approval/approval-modal";
import { WarnModal } from "@/components/approval/warn-modal";
import { Receipt, Check, AlertCircle, X, BarChart2, Clock, CheckCircle, Plus } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { toast } from "sonner";
import { sendPushFromClient } from "@/lib/push-notifications";
import { getRecipientIds } from "@/lib/notification-recipients";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

type PeriodFilter = "weekly" | "monthly" | "yearly";

function getPeriodRange(period: PeriodFilter): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (period === "weekly") {
    start.setDate(start.getDate() - 7);
  } else if (period === "monthly") {
    start.setMonth(start.getMonth() - 1);
  } else {
    start.setFullYear(start.getFullYear() - 1);
  }
  return { start, end };
}

export default function BolgePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("monthly");
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; num: string } | null>(null);
  const [warnModal, setWarnModal] = useState<Expense | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptModal, setReceiptModal] = useState<{ url: string; expenseId: string } | null>(null);
  const [receiptViewedIds, setReceiptViewedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"dashboard" | "pending" | "done">("dashboard");
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "dashboard" || t === "pending" || t === "done") setActiveTab(t);
  }, [searchParams]);

  const bolge = profile?.bolge ?? "";

  const { start: periodStart, end: periodEnd } = useMemo(
    () => getPeriodRange(periodFilter),
    [periodFilter]
  );

  const periodExpenses = useMemo(() => {
    return allExpenses.filter((e) => {
      const d = new Date(e.created_at);
      return d >= periodStart && d <= periodEnd;
    });
  }, [allExpenses, periodStart, periodEnd]);

  const pending = useMemo(
    () => allExpenses.filter((e) => e.status === "pending_bolge"),
    [allExpenses]
  );
  const done = useMemo(
    () =>
      allExpenses
        .filter((e) => ["approved_bolge", "rejected_bolge"].includes(e.status))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [allExpenses]
  );

  const dashboardMetrics = useMemo(() => {
    const total = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const count = periodExpenses.length;
    return {
      totalAmount: total,
      expenseCount: count,
      pendingCount: pending.length,
      avgExpense: count > 0 ? total / count : 0,
    };
  }, [periodExpenses, pending.length]);

  const personelChartData = useMemo(() => {
    const byName: Record<string, number> = {};
    periodExpenses.forEach((e) => {
      const name = e.submitter_name || "Belirsiz";
      byName[name] = (byName[name] ?? 0) + Number(e.amount);
    });
    return Object.entries(byName).map(([name, toplam]) => ({ name, toplam }));
  }, [periodExpenses]);

  const typeChartData = useMemo(() => {
    const types = ["Ulaşım", "Konaklama", "Yemek", "Malzeme", "Diğer"];
    const byType: Record<string, number> = {};
    types.forEach((t) => (byType[t] = 0));
    periodExpenses.forEach((e) => {
      const t = e.expense_type || "Diğer";
      byType[t] = (byType[t] ?? 0) + Number(e.amount);
    });
    return Object.entries(byType).map(([tür, toplam]) => ({ tür, toplam }));
  }, [periodExpenses]);

  const ilChartData = useMemo(() => {
    const byIl: Record<string, number> = {};
    periodExpenses.forEach((e) => {
      const il = e.il || "Belirsiz";
      byIl[il] = (byIl[il] ?? 0) + Number(e.amount);
    });
    return Object.entries(byIl).map(([il, toplam]) => ({ il, toplam }));
  }, [periodExpenses]);

  const PIE_COLORS = ["#2563EB", "#22C55E", "#EAB308", "#F97316", "#64748B"];

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(p as Profile | null);
    })();
  }, [supabase]);

  const refetch = useCallback(async () => {
    if (!bolge) return;
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("bolge", bolge)
      .order("created_at", { ascending: false });
    setAllExpenses((data ?? []) as Expense[]);
    setLoading(false);
  }, [bolge, supabase]);

  useEffect(() => {
    if (!bolge) return;
    refetch();
  }, [bolge, refetch]);

  useExpensesRealtime(supabase, {
    filter: bolge ? { column: "bolge", value: bolge } : undefined,
    refetch,
  });

  async function handleApprove(expense: Expense) {
    setActionLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("expenses")
        .update({
          status: "approved_bolge",
          reviewed_by_bolge: user.id,
          reviewed_at_bolge: new Date().toISOString(),
        })
        .eq("id", expense.id);

      const koordIds = await getRecipientIds(supabase, { role: "koordinator" });
      if (koordIds.length > 0) {
        await supabase.from("notifications").insert(
          koordIds.map((recipient_id) => ({
            recipient_id,
            message: `[${expense.expense_number}] bölge onaylandı, koordinatör onayı bekleniyor.`,
            expense_id: expense.id,
          }))
        );
      }
      sendPushFromClient({
        recipient_role: "koordinator",
        expense_id: expense.id,
        title: "Harcama koordinatör onayı bekliyor",
        body: `${expense.expense_number} bölge onaylandı`,
        url: "/dashboard/koordinator",
      });

      setAllExpenses((prev) =>
        prev.map((e) =>
          e.id === expense.id
            ? { ...e, status: "approved_bolge" as const }
            : e
        )
      );
      toast.success("Onaylandı.");
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWarnApprove(expense: Expense, message: string) {
    setActionLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("expenses")
        .update({
          status: "approved_bolge",
          bolge_warning: true,
          bolge_note: message,
          reviewed_by_bolge: user.id,
          reviewed_at_bolge: new Date().toISOString(),
        })
        .eq("id", expense.id);

      const koordIds = await getRecipientIds(supabase, { role: "koordinator" });
      const warnNotifications: { recipient_id: string; message: string; expense_id: string }[] = [
        ...koordIds.map((recipient_id) => ({
          recipient_id,
          message: `[${expense.expense_number}] bölge onaylandı (uyarılı), koordinatör onayı bekleniyor.`,
          expense_id: expense.id,
        })),
        {
          recipient_id: expense.submitter_id,
          message: `[${expense.expense_number}] bölge sorumlusu notu: ${message}`,
          expense_id: expense.id,
        },
      ];
      if (warnNotifications.length > 0) {
        await supabase.from("notifications").insert(warnNotifications);
      }
      sendPushFromClient({
        recipient_role: "koordinator",
        expense_id: expense.id,
        title: "Harcama koordinatör onayı bekliyor",
        body: `${expense.expense_number} bölge onaylandı (uyarılı)`,
        url: "/dashboard/koordinator",
      });
      sendPushFromClient({
        recipient_id: expense.submitter_id,
        title: "Bölge sorumlusu notu",
        body: `${expense.expense_number}: ${message}`,
        url: "/dashboard/deneyap",
      });

      setWarnModal(null);
      setAllExpenses((prev) =>
        prev.map((e) =>
          e.id === expense.id
            ? { ...e, status: "approved_bolge" as const, bolge_warning: true, bolge_note: message }
            : e
        )
      );
      toast.success("Uyarılı onay gönderildi.");
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(expenseId: string) {
    if (!rejectModal || rejectModal.id !== expenseId) return;
    setActionLoading(true);
    try {
      const expense = pending.find((e) => e.id === expenseId);
      if (!expense) return;
      await supabase
        .from("expenses")
        .update({ status: "rejected_bolge" })
        .eq("id", expenseId);

      await supabase.from("notifications").insert({
        recipient_id: expense.submitter_id,
        message: `[${expense.expense_number}] bölge sorumlusu tarafından reddedildi.`,
        expense_id: expenseId,
      });
      sendPushFromClient({
        recipient_id: expense.submitter_id,
        title: "Harcamanız reddedildi",
        body: `${expense.expense_number} bölge sorumlusu tarafından reddedildi`,
        url: "/dashboard/deneyap",
      });

      setRejectModal(null);
      setAllExpenses((prev) =>
        prev.map((e) =>
          e.id === expenseId ? { ...e, status: "rejected_bolge" as const } : e
        )
      );
      toast.success("Reddedildi.");
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !bolge) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-20">
        <h1 className="text-lg font-semibold text-slate-800 mb-4">Bölge Sorumlusu</h1>

        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(
                [
                  { key: "weekly" as const, label: "Haftalık" },
                  { key: "monthly" as const, label: "Aylık" },
                  { key: "yearly" as const, label: "Yıllık" },
                ] as const
              ).map(({ key, label }) => (
                <Button
                  key={key}
                  variant={periodFilter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriodFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                title="Toplam harcama (₺)"
                value={formatCurrency(dashboardMetrics.totalAmount)}
              />
              <MetricCard title="Harcama sayısı" value={dashboardMetrics.expenseCount} />
              <MetricCard title="Bekleyen onay" value={dashboardMetrics.pendingCount} />
              <MetricCard
                title="Ortalama harcama (₺)"
                value={formatCurrency(dashboardMetrics.avgExpense)}
              />
            </div>

            {personelChartData.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">
                    Personel bazlı harcama
                  </h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={personelChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <XAxis type="number" tickFormatter={(v) => `${v} ₺`} fontSize={11} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={72}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => (v.length > 8 ? v.slice(0, 7) + "…" : v)}
                        />
                        <Tooltip
                          formatter={(v: number) => [formatCurrency(v), "Toplam"]}
                          labelFormatter={(l) => l}
                        />
                        <Bar dataKey="toplam" fill="#2563EB" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {(typeChartData.some((d) => d.toplam > 0)) && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">
                    Harcama türü dağılımı
                  </h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeChartData.filter((d) => d.toplam > 0)}
                          dataKey="toplam"
                          nameKey="tür"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
                          label={({ tür, toplam }) => `${tür}: ${formatCurrency(toplam)}`}
                        >
                          {typeChartData.filter((d) => d.toplam > 0).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {ilChartData.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">
                    İl bazlı karşılaştırma
                  </h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={ilChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                      >
                        <XAxis type="number" tickFormatter={(v) => `${v} ₺`} fontSize={11} />
                        <YAxis type="category" dataKey="il" width={56} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: number) => [formatCurrency(v), "Toplam"]}
                          labelFormatter={(l) => l}
                        />
                        <Bar dataKey="toplam" fill="#2563EB" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "pending" && (
          <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-slate-600 font-medium">Henüz harcama yok</p>
              <p className="text-sm text-slate-400 mt-1">Onay bekleyen harcama bulunmuyor.</p>
            </div>
          ) : (
            pending.map((e) => {
              const hasReceipt = !!e.receipt_url;
              const receiptViewed = receiptViewedIds.has(e.id);
              const buttonsDisabled = hasReceipt && !receiptViewed;
              const typeIcon = { Ulaşım: "🚗", Konaklama: "🏨", Yemek: "🍽️", Malzeme: "📦", Diğer: "📋" }[e.expense_type] ?? "📋";
              return (
                <Card key={e.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-lg font-semibold text-slate-800">{e.submitter_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{e.il} · {e.expense_number} · {formatDate(e.created_at)}</p>
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl" aria-hidden>{typeIcon}</span>
                      <span className="text-xl font-bold text-slate-800">{formatCurrency(e.amount)}</span>
                      <span className="text-sm text-slate-500">{e.expense_type}</span>
                    </div>
                    {e.description && (
                      <p className="text-sm text-slate-500 italic">{e.description}</p>
                    )}
                    {hasReceipt ? (
                      <button
                        type="button"
                        onClick={() => setReceiptModal({ url: e.receipt_url!, expenseId: e.id })}
                        className="flex items-center gap-2 text-sm text-primary font-medium"
                      >
                        <Receipt className="h-4 w-4" />
                        Fişi görüntüle
                      </button>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Fiş yüklenmemiş
                      </div>
                    )}
                    <div
                      className="flex flex-col gap-1.5 pt-1"
                      title={buttonsDisabled ? "Önce fişi görüntüleyin" : undefined}
                    >
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(e)}
                        disabled={actionLoading || buttonsDisabled}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-amber-400 text-amber-700 hover:bg-amber-50"
                        onClick={() => setWarnModal(e)}
                        disabled={actionLoading || buttonsDisabled}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Uyarılı onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => setRejectModal({ id: e.id, num: e.expense_number })}
                        disabled={actionLoading || buttonsDisabled}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reddet
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          </div>
        )}

        {activeTab === "done" && (
          <div className="space-y-3">
            {done.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-slate-600 font-medium">Henüz kayıt yok</p>
                <p className="text-sm text-slate-400 mt-1">Onaylanan veya reddedilen harcama bulunmuyor.</p>
              </div>
            ) : (
              done.map((e) => (
                <Card key={e.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{e.submitter_name}</p>
                        <p className="text-sm text-slate-500">{e.expense_number} · {formatCurrency(e.amount)}</p>
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <BottomNav
        tabs={[
          { id: "dashboard", label: "Dashboard", icon: BarChart2 },
          { id: "pending", label: "Bekleyenler", icon: Clock, badge: pending.length },
          { id: "done", label: "Sonuçlananlar", icon: CheckCircle },
          { id: "yeni", label: "Yeni", icon: Plus, href: "/dashboard/bolge/yeni" },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => tab !== "yeni" && setActiveTab(tab as "dashboard" | "pending" | "done")}
      />

      <ApprovalModal
        open={!!rejectModal}
        onOpenChange={(o) => !o && setRejectModal(null)}
        title="Reddet"
        description={`${rejectModal?.num ?? ""} numaralı harcamayı reddetmek istediğinize emin misiniz?`}
        confirmLabel="Reddet"
        variant="destructive"
        onConfirm={() => { if (rejectModal) void handleReject(rejectModal.id); }}
        loading={actionLoading}
      />

      <WarnModal
        open={!!warnModal}
        onOpenChange={(o) => !o && setWarnModal(null)}
        onConfirm={(msg) => { if (warnModal) void handleWarnApprove(warnModal, msg); }}
        loading={actionLoading}
      />

      <Dialog
        open={!!receiptModal}
        onOpenChange={(open) => {
          if (!open && receiptModal) {
            setReceiptViewedIds((prev) => new Set(prev).add(receiptModal.expenseId));
            setReceiptModal(null);
          }
        }}
      >
        <DialogContent className="max-w-[95vw] max-h-[90vh]" showClose={true}>
          <DialogHeader>
            <DialogTitle>Fiş</DialogTitle>
          </DialogHeader>
          {receiptModal && (
            <img
              src={receiptModal.url}
              alt="Fiş"
              className="w-full h-auto rounded object-contain max-h-[70vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
