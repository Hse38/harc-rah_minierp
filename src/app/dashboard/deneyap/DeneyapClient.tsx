"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Expense } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpenseCard } from "@/components/expenses/expense-card";
import { StatusBadge } from "@/components/expenses/status-badge";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ApprovalModal } from "@/components/approval/approval-modal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { useExpensesRealtime, getExpenseStatusLabel } from "@/lib/realtime-expenses";
import { formatCurrency, formatDate, bolgeAdi } from "@/lib/utils";
import { BarChart2, List, Plus, Pencil, XCircle, Send } from "lucide-react";
import { toast } from "sonner";
import type { DashboardDeneyapResponse } from "@/app/api/dashboard/route";
import { useHighlightExpense } from "@/lib/use-highlight-expense";

const DeneyapChart = dynamic(
  () => import("@/components/dashboard/DeneyapChart").then((m) => ({ default: m.DeneyapChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-xl" /> }
);

const EXPENSE_FIELDS_LIST =
  "id,expense_number,submitter_id,submitter_name,iban,il,bolge,expense_type,amount,description,receipt_url,ai_analysis,status,bolge_note,bolge_warning,reviewed_by_bolge,reviewed_by_koord,reviewed_at_bolge,reviewed_at_koord,created_at";

export function DeneyapClient({
  initialData,
}: {
  initialData: DashboardDeneyapResponse | null;
}) {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const highlight = useHighlightExpense();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(!initialData);
  const [activeTab, setActiveTab] = useState<"dashboard" | "list">("dashboard");
  const [submitterId, setSubmitterId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Expense | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [profile, setProfile] = useState<{ full_name?: string; il?: string; bolge?: string } | null>(null);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "dashboard" || t === "list") setActiveTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (highlight) setActiveTab("list");
  }, [highlight]);

  const refetch = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("expenses")
      .select(EXPENSE_FIELDS_LIST)
      .eq("submitter_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    setExpenses((data ?? []) as Expense[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setSubmitterId(user.id);
      const { data: p } = await supabase.from("profiles").select("full_name, il, bolge").eq("id", user.id).single();
      setProfile((p as { full_name?: string; il?: string; bolge?: string } | null) ?? null);
      const { data } = await supabase
        .from("expenses")
        .select(EXPENSE_FIELDS_LIST)
        .eq("submitter_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      setExpenses((data ?? []) as Expense[]);
      setLoading(false);
    })();
  }, [supabase]);

  useExpensesRealtime(supabase, {
    filter: submitterId ? { column: "submitter_id", value: submitterId } : undefined,
    refetch,
    onStatusChange: (expense) => {
      toast.success(`${expense.expense_number} durumu güncellendi: ${getExpenseStatusLabel(expense.status)}`);
    },
  });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTotal = useMemo(
    () =>
      expenses
        .filter((e) => new Date(e.created_at) >= thisMonthStart)
        .reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );
  const pendingCount = useMemo(
    () => expenses.filter((e) => e.status === "pending_bolge").length,
    [expenses]
  );
  const approvedCount = useMemo(
    () =>
      expenses.filter((e) =>
        ["approved_bolge", "approved_koord", "paid"].includes(e.status)
      ).length,
    [expenses]
  );
  const last3 = useMemo(() => expenses.slice(0, 3), [expenses]);

  const displayData = useMemo((): DashboardDeneyapResponse | null => {
    if (expenses.length > 0) {
      const rows = expenses;
      const totalSpending = rows.reduce((s, e) => s + Number(e.amount), 0);
      const monthlySpending = rows
        .filter((e) => new Date(e.created_at) >= thisMonthStart)
        .reduce((s, e) => s + Number(e.amount), 0);
      const paidAmount = rows.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
      const chartData: { ay: string; toplam: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const total = rows
          .filter((e) => {
            const t = new Date(e.created_at);
            return t >= start && t <= end;
          })
          .reduce((s, e) => s + Number(e.amount), 0);
        chartData.push({
          ay: new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit" }).format(d),
          toplam: total,
        });
      }
      return {
        totalSpending,
        monthlySpending,
        paidAmount,
        averageSpending: rows.length ? totalSpending / rows.length : 0,
        approvalStats: {
          pending: pendingCount,
          approved: approvedCount,
          paid: rows.filter((e) => e.status === "paid").length,
          rejected: rows.filter((e) => ["rejected_bolge", "rejected_koord"].includes(e.status)).length,
        },
        chartData,
        recentExpenses: rows.slice(0, 5).map((e) => ({
          id: e.id,
          expense_number: e.expense_number,
          amount: e.amount,
          status: e.status,
          created_at: e.created_at,
          expense_type: e.expense_type ?? "Diğer",
        })),
      };
    }
    return initialData;
  }, [expenses, initialData, thisMonthStart, now, pendingCount, approvedCount]);

  async function handleCancelExpense(exp: Expense) {
    setCancelling(true);
    try {
      await supabase.from("expenses").delete().eq("id", exp.id);
      setExpenses((prev) => prev.filter((e) => e.id !== exp.id));
      toast.success(`${exp.expense_number} iptal edildi`);
      setCancelTarget(null);
    } catch {
      toast.error("İptal edilemedi.");
    } finally {
      setCancelling(false);
    }
  }

  const monthlyData = displayData?.chartData ?? [];
  const recentForUi = displayData?.recentExpenses?.slice(0, 3) ?? [];
  const recentFive = displayData?.recentExpenses?.slice(0, 5) ?? [];
  const lastMonthTotal = monthlyData[4]?.toplam ?? 0;
  const monthTotalForTrend = displayData?.monthlySpending ?? 0;
  const trendPct =
    lastMonthTotal > 0 && monthTotalForTrend > 0
      ? Math.round(((monthTotalForTrend - lastMonthTotal) / lastMonthTotal) * 100)
      : null;
  const thisMonthApprovedAmount = useMemo(
    () =>
      expenses
        .filter(
          (e) =>
            ["approved_bolge", "approved_koord", "paid"].includes(e.status) &&
            new Date(e.created_at) >= thisMonthStart
        )
        .reduce((s, e) => s + Number(e.amount), 0),
    [expenses, thisMonthStart]
  );
  const pendingExpenses = useMemo(
    () => expenses.filter((e) => e.status === "pending_bolge").sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [expenses]
  );
  const oldestPendingDays =
    pendingExpenses.length > 0
      ? Math.floor((now.getTime() - new Date(pendingExpenses[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;
  const CATEGORY_COLORS: Record<string, string> = {
    Ulaşım: "#1E40AF",
    Yemek: "#059669",
    Konaklama: "#D97706",
    Malzeme: "#7C3AED",
    Diğer: "#6B7280",
  };

  if (loading && !displayData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#2563EB]" />
      </div>
    );
  }

  const monthTotal = displayData?.monthlySpending ?? 0;
  const approved = displayData?.approvalStats?.approved ?? 0;
  const paidVal = displayData?.paidAmount ?? 0;
  const avgVal = displayData?.averageSpending ?? 0;
  const rejectedCount = displayData?.approvalStats?.rejected ?? 0;

  const todayStr = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(now);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-20">
        <div className="md:hidden">
          <DashboardHeader title="Harcamalarım" />
        </div>
        {activeTab === "dashboard" && (
          <>
            {/* Hero: sadece md ve üzeri */}
            <div className="hidden md:block mb-4 lg:mb-6 pb-4 lg:pb-6 border-b border-gray-200">
              <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                    Merhaba, {profile?.full_name?.trim() || "Kullanıcı"} 👋
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[profile?.il || "Deneyap", profile?.bolge ? bolgeAdi(profile.bolge) : ""].filter(Boolean).join(" • ") || "Deneyap"}
                  </p>
                </div>
                <p className="text-sm text-gray-500 lg:shrink-0">{todayStr}</p>
              </div>
            </div>

            <div className="space-y-4 lg:space-y-6">
              {/* Mobil: mevcut 3 kart + büyük kart (değişmedi) */}
              <div className="lg:hidden">
                <div className="grid grid-cols-1 gap-4">
                  <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-[#2563EB]/10 to-white border-[#2563EB]/20">
                    <CardContent className="p-5">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Bu ay toplam harcamam</p>
                      <p className="text-3xl font-bold text-slate-800 mt-1">{formatCurrency(monthTotal)}</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold text-[#D97706]">{pendingCount}</p>
                      <p className="text-xs text-slate-500 mt-0.5">bekliyor</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold text-[#16A34A]">{approved}</p>
                      <p className="text-xs text-slate-500 mt-0.5">onaylandı</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl shadow-sm">
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold text-[#7C3AED]">{displayData?.approvalStats?.paid ?? 0}</p>
                      <p className="text-xs text-slate-500 mt-0.5">ödendi</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* md+: 2x2 metrik kartları */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <MetricCard
                  label="Bu ay toplam harcama"
                  value={formatCurrency(monthTotal)}
                  trend={
                    trendPct != null
                      ? { text: `Geçen aya göre ${trendPct >= 0 ? "+" : ""}${trendPct}%`, up: trendPct <= 0 }
                      : undefined
                  }
                  borderColor="primary"
                />
                <MetricCard
                  label="Bekleyen onay sayısı"
                  value={pendingCount}
                  trend={oldestPendingDays != null && pendingCount > 0 ? { text: `En eski: ${oldestPendingDays} gün önce` } : undefined}
                  borderColor="warning"
                />
                <MetricCard
                  label="Onaylanan harcama"
                  value={formatCurrency(thisMonthApprovedAmount)}
                  trend={approved > 0 ? { text: `Bu ay ${approved} harcama onaylandı` } : undefined}
                  borderColor="success"
                />
                <MetricCard
                  label="Ödenen tutar"
                  value={formatCurrency(paidVal)}
                  trend={(displayData?.approvalStats?.paid ?? 0) > 0 ? { text: `${displayData?.approvalStats?.paid} harcama ödendi` } : undefined}
                  borderColor="purple"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                <div className="lg:col-span-8">
                  {monthlyData.some((d) => d.toplam > 0) ? (
                    <AnalyticsChart title="Aylık Harcama Trendi" subtitle="Son 6 ay">
                      <DeneyapChart data={monthlyData} />
                    </AnalyticsChart>
                  ) : (
                    <AnalyticsChart title="Aylık Harcama Trendi" subtitle="Son 6 ay">
                      <div className="h-44 md:h-[280px] flex items-center justify-center text-gray-500 text-sm">Henüz veri yok</div>
                    </AnalyticsChart>
                  )}
                </div>
                <div className="lg:col-span-4">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm md:text-[14px] font-semibold text-[#374151]">Son Harcamalar</h3>
                      <Link
                        href="/dashboard/deneyap?tab=list"
                        className="text-xs font-medium text-[#1E40AF] hover:underline hidden md:inline"
                      >
                        Tümünü gör →
                      </Link>
                    </div>
                    {recentFive.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center">
                        <p className="text-sm font-medium text-slate-600">Henüz harcama yok</p>
                        <p className="text-xs text-slate-400 mt-1">Yeni harcama ekleyerek başlayın.</p>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {recentFive.map((e) => (
                          <li key={e.id}>
                            <div className="rounded-xl border border-gray-100 p-3 flex items-start justify-between gap-2 transition-all duration-200 md:hover:shadow-sm">
                              <div className="min-w-0 flex-1">
                                <span
                                  className="inline-block text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded text-white shrink-0"
                                  style={{ backgroundColor: CATEGORY_COLORS[e.expense_type ?? "Diğer"] ?? CATEGORY_COLORS.Diğer }}
                                >
                                  {e.expense_type ?? "Diğer"}
                                </span>
                                <p className="font-medium text-gray-900 mt-1 truncate">{e.expense_number}</p>
                                <p className="text-xs text-gray-500">{formatDate(e.created_at)}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-gray-900">{formatCurrency(e.amount)}</p>
                                <StatusBadge status={e.status} />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "list" && (
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
                <p className="text-slate-500 font-medium">Henüz harcama yok</p>
                <p className="text-sm text-slate-400 mt-1">Yeni harcama ekleyerek başlayın.</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/deneyap/yeni" prefetch>+ Yeni harcama ekle</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {expenses.map((e) => (
                  <li key={e.id}>
                    <ExpenseCard
                      expense={e}
                      deputyLabel={
                        profile?.il && e.il && e.il !== profile.il
                          ? `Vekaleten · ${e.il}`
                          : undefined
                      }
                      actions={
                        (e.status === "pending_bolge" ||
                          e.status === "rejected_bolge" ||
                          e.status === "rejected_koord") ? (
                          <>
                            {(e.status === "rejected_bolge" || e.status === "rejected_koord") && (
                              <Button size="sm" variant="outline" className="flex-1 min-w-[140px]" asChild>
                                <Link href={`/dashboard/deneyap/duzenle/${e.id}`} prefetch>
                                  <Send className="h-4 w-4 mr-2" /> Düzeltip Tekrar Gönder
                                </Link>
                              </Button>
                            )}
                            {e.status === "pending_bolge" && (
                              <>
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/dashboard/deneyap/duzenle/${e.id}`} prefetch>
                                    <Pencil className="h-4 w-4 mr-2" /> Düzenle
                                  </Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setCancelTarget(e)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" /> İptal Et
                                </Button>
                              </>
                            )}
                          </>
                        ) : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <ApprovalModal
          open={!!cancelTarget}
          onOpenChange={(open) => !open && setCancelTarget(null)}
          title="Harcamayı iptal et"
          description={cancelTarget ? "Bu harcamayı iptal etmek istiyor musunuz?" : ""}
          confirmLabel="Evet, iptal et"
          variant="destructive"
          onConfirm={() => { if (cancelTarget) void handleCancelExpense(cancelTarget); }}
          loading={cancelling}
        />
      </div>

      <BottomNav
        tabs={[
          { id: "dashboard", label: "Dashboard", icon: BarChart2 },
          { id: "list", label: "Harcamalarım", icon: List },
          { id: "yeni", label: "+ Yeni", icon: Plus, href: "/dashboard/deneyap/yeni" },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => id !== "yeni" && setActiveTab(id as "dashboard" | "list")}
      />
    </div>
  );
}
