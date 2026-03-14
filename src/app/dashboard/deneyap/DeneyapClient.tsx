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
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { useExpensesRealtime, getExpenseStatusLabel } from "@/lib/realtime-expenses";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart2, List, Plus, Pencil, XCircle, Send } from "lucide-react";
import { toast } from "sonner";
import type { DashboardDeneyapResponse } from "@/app/api/dashboard/route";

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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(!initialData);
  const [activeTab, setActiveTab] = useState<"dashboard" | "list">("dashboard");
  const [submitterId, setSubmitterId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Expense | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "dashboard" || t === "list") setActiveTab(t);
  }, [searchParams]);

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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-20">
        <DashboardHeader title="Harcamalarım" />
        {activeTab === "dashboard" && (
          <>
            <div className="space-y-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
              <div className="lg:col-span-4">
                <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-[#2563EB]/10 to-white border-[#2563EB]/20 lg:rounded-xl lg:border-gray-200 lg:shadow-sm lg:hover:shadow-md lg:transition">
                  <CardContent className="p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wide lg:text-sm lg:text-gray-500 lg:normal-case">Bu ay toplam harcamam</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1 lg:tracking-tight lg:text-gray-900">{formatCurrency(monthTotal)}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="hidden lg:block lg:col-span-4">
                <StatCard label="Aylık harcama" value={formatCurrency(monthTotal)} />
              </div>
              <div className="lg:col-span-4">
                <div className="hidden lg:block">
                  <StatCard
                    label="Onay durumu"
                    value={`${approved} onaylı`}
                    trend={pendingCount > 0 ? { text: `${pendingCount} bekliyor` } : undefined}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 lg:hidden">
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

              <div className="hidden lg:block lg:col-span-3">
                <StatCard label="Ödenen tutar" value={formatCurrency(paidVal)} />
              </div>
              <div className="hidden lg:block lg:col-span-3">
                <StatCard label="Ortalama harcama" value={displayData ? (avgVal ? formatCurrency(avgVal) : "—") : "—"} />
              </div>
              <div className="hidden lg:block lg:col-span-3">
                <StatCard label="Bekleyen talepler" value={pendingCount} />
              </div>
              <div className="hidden lg:block lg:col-span-3">
                <StatCard label="Reddedilen" value={rejectedCount} />
              </div>

              <div className="lg:col-span-8">
                {monthlyData.some((d) => d.toplam > 0) ? (
                  <AnalyticsChart title="Aylık harcama trendi" subtitle="Son 6 ay">
                    <DeneyapChart data={monthlyData} />
                  </AnalyticsChart>
                ) : (
                  <AnalyticsChart title="Aylık harcama trendi" subtitle="Son 6 ay">
                    <div className="h-44 lg:h-52 flex items-center justify-center text-gray-500 text-sm">Henüz veri yok</div>
                  </AnalyticsChart>
                )}
              </div>
              <div className="lg:col-span-4">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 lg:p-5">
                  <h3 className="text-sm font-medium text-slate-700 mb-2 lg:text-base lg:text-gray-900">Son harcamalar</h3>
                  {recentForUi.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center">
                      <p className="text-sm font-medium text-slate-600">Henüz harcama yok</p>
                      <p className="text-xs text-slate-400 mt-1">Yeni harcama ekleyerek başlayın.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {recentForUi.map((e) => (
                        <Card key={e.id} className="rounded-xl shadow-sm border-gray-200">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-800">{e.expense_number}</p>
                              <p className="text-xs text-slate-500">{e.expense_type} · {formatDate(e.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-800">{formatCurrency(e.amount)}</p>
                              <StatusBadge status={e.status} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </ul>
                  )}
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
