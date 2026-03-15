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
import { formatCurrency, formatDate, bolgeAdi } from "@/lib/utils";
import { EXPENSE_FIELDS_FULL, PROFILE_FIELDS_FORM } from "@/lib/expense-fields";
import { CHART_COLORS, CHART_GRID_STROKE, CHART_GRID_STROKE_DASHARRAY, formatCurrencyTR } from "@/lib/dashboard-theme";
import { ApprovalModal } from "@/components/approval/approval-modal";
import { WarnModal } from "@/components/approval/warn-modal";
import { Receipt, Check, AlertCircle, X, BarChart2, Clock, CheckCircle, Plus } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { toast } from "sonner";
import { notifyApi } from "@/lib/notify-api";
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

  const PIE_COLORS = CHART_COLORS;

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select(PROFILE_FIELDS_FORM)
        .eq("id", user.id)
        .single();
      setProfile(p as Profile | null);
    })();
  }, [supabase]);

  const refetch = useCallback(async () => {
    if (!bolge) return;
    const { data } = await supabase
      .from("expenses")
      .select(EXPENSE_FIELDS_FULL)
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

      notifyApi({
        toRole: "koordinator",
        expenseId: expense.id,
        message: `[${expense.expense_number}] bölge onaylandı, koordinatör onayı bekleniyor.`,
        pushTitle: "TAMGA - Onay Bekleniyor",
        pushBody: `${expense.expense_number} bölge onaylandı, koordinatör onayı bekleniyor`,
        pushUrl: "/dashboard/koordinator",
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

      notifyApi({
        toRole: "koordinator",
        expenseId: expense.id,
        message: `[${expense.expense_number}] bölge onaylandı (uyarılı), koordinatör onayı bekleniyor.`,
        pushTitle: "TAMGA - Uyarılı Onay",
        pushBody: `${expense.expense_number} uyarılı onaylandı`,
        pushUrl: "/dashboard/koordinator",
      });
      notifyApi({
        recipientId: expense.submitter_id,
        recipientRole: "deneyap",
        expenseId: expense.id,
        message: `[${expense.expense_number}] bölge sorumlusu notu: ${message}`,
        pushTitle: "TAMGA - Uyarılı Onay",
        pushBody: `Harcamanız uyarıyla onaylandı: ${message}`,
        pushUrl: "/dashboard/deneyap",
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

      notifyApi({
        recipientId: expense.submitter_id,
        recipientRole: "deneyap",
        expenseId: expenseId,
        message: `[${expense.expense_number}] bölge sorumlusu tarafından reddedildi.`,
        pushTitle: "TAMGA - Reddedildi",
        pushBody: `${expense.expense_number} numaralı harcamanız reddedildi`,
        pushUrl: "/dashboard/deneyap",
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

  const daysLeftInMonth = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0).getDate() - periodEnd.getDate();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-20">
        <h1 className="text-lg font-semibold text-slate-800 mb-4 md:hidden">Bölge Sorumlusu</h1>

        {activeTab === "dashboard" && (
          <div className="space-y-4">
            {/* Hero + period filter: sadece md+ */}
            <div className="hidden md:flex md:flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-gray-200">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{profile?.bolge ? bolgeAdi(profile.bolge) : "Bölge"}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{profile?.full_name} • Bölge Sorumlusu</p>
              </div>
              <div className="flex gap-2 shrink-0">
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
                    className="rounded-full"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 md:hidden">
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

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard
                title="Toplam Harcama"
                value={formatCurrency(dashboardMetrics.totalAmount)}
                borderColor="primary"
              />
              <MetricCard
                title="Harcama Sayısı"
                value={dashboardMetrics.expenseCount}
                borderColor="success"
              />
              <MetricCard
                title="Bekleyen Onay"
                value={dashboardMetrics.pendingCount}
                borderColor="warning"
                trend={dashboardMetrics.pendingCount >= 3 ? { text: "Acil" } : undefined}
                className={dashboardMetrics.pendingCount >= 3 ? "ring-1 ring-red-200" : ""}
              />
              <MetricCard
                title="Ortalama Harcama"
                value={formatCurrency(dashboardMetrics.avgExpense)}
                borderColor="purple"
              />
            </div>

            {personelChartData.length > 0 && (
              <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-3">Personel Bazlı Harcama Özeti</h3>
                  <div className="h-56 md:h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={personelChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <XAxis type="number" tickFormatter={(v) => formatCurrencyTR(v)} fontSize={11} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={72}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => (v.length > 8 ? v.slice(0, 7) + "…" : v)}
                        />
                        <Tooltip
                          formatter={(v: number) => [formatCurrencyTR(v), "Toplam"]}
                          contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Bar dataKey="toplam" fill={CHART_COLORS[0]} radius={[0, 6, 6, 0]} barSize={32} isAnimationActive />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {(typeChartData.some((d) => d.toplam > 0)) && (
              <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-3">Harcama Türü Dağılımı</h3>
                  <div className="h-56 md:h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeChartData.filter((d) => d.toplam > 0)}
                          dataKey="toplam"
                          nameKey="tür"
                          cx="50%"
                          cy="50%"
                          innerRadius={56}
                          outerRadius={80}
                          paddingAngle={2}
                          label={false}
                        >
                          {typeChartData.filter((d) => d.toplam > 0).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: { payload?: { toplam: number; tür: string } }) => {
                            const total = typeChartData.reduce((s, d) => s + d.toplam, 0);
                            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${props.payload?.tür ?? name}: ${formatCurrencyTR(value)} (%${pct})`;
                          }}
                          contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {ilChartData.length > 0 && (
              <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-3">İl Bazlı Harcama Karşılaştırması</h3>
                  <div className="h-56 md:h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={ilChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                      >
                        <XAxis type="number" tickFormatter={(v) => formatCurrencyTR(v)} fontSize={11} />
                        <YAxis type="category" dataKey="il" width={56} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v: number) => [formatCurrencyTR(v), "Toplam"]}
                          contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Bar dataKey="toplam" fill={CHART_COLORS[0]} radius={[0, 6, 6, 0]} barSize={32} isAnimationActive />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Limit durumu kartı: md+ */}
            <div className="hidden md:block">
              <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-2">Limit Durumu</h3>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardMetrics.totalAmount)} <span className="text-gray-400 font-normal text-base">/ — kullanıldı</span></p>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1E40AF] rounded-full transition-all" style={{ width: "0%" }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{daysLeftInMonth} gün kaldı (bu ay)</p>
                </CardContent>
              </Card>
            </div>
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
