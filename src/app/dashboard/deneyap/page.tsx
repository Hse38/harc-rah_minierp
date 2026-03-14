"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
import { useExpensesRealtime, getExpenseStatusLabel } from "@/lib/realtime-expenses";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart2, List, Plus, Pencil, XCircle, Send } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function DeneyapPage() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "list">("dashboard");
  const [submitterId, setSubmitterId] = useState<string | null>(null);

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
      .select("*")
      .eq("submitter_id", user.id)
      .order("created_at", { ascending: false });
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
        .select("*")
        .eq("submitter_id", user.id)
        .order("created_at", { ascending: false });
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

  const monthlyData = useMemo(() => {
    const months: { ay: string; toplam: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const total = expenses
        .filter((e) => {
          const t = new Date(e.created_at);
          return t >= start && t <= end;
        })
        .reduce((s, e) => s + Number(e.amount), 0);
      months.push({
        ay: new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit" }).format(d),
        toplam: total,
      });
    }
    return months;
  }, [expenses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-20">
        <h1 className="text-lg font-semibold text-slate-800 mb-4">Harcamalarım</h1>

        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-[#2563EB]/10 to-white border-[#2563EB]/20">
              <CardContent className="p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Bu ay toplam harcamam</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{formatCurrency(thisMonthTotal)}</p>
              </CardContent>
            </Card>
            <div className="grid grid-cols-3 gap-2">
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-[#D97706]">{pendingCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">bekliyor</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-[#16A34A]">{approvedCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">onaylandı</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-[#7C3AED]">{expenses.filter((e) => e.status === "paid").length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">ödendi</p>
                </CardContent>
              </Card>
            </div>

            {monthlyData.some((d) => d.toplam > 0) && (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Son 6 ay</h3>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <XAxis dataKey="ay" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v} ₺`} />
                        <Tooltip formatter={(v: number) => [formatCurrency(v), "Toplam"]} />
                        <Bar dataKey="toplam" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Son 3 harcama</h3>
              {last3.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                  <p className="text-sm font-medium text-slate-600">Henüz harcama yok</p>
                  <p className="text-xs text-slate-400 mt-1">Yeni harcama ekleyerek başlayın.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {last3.map((e) => (
                    <Card key={e.id} className="rounded-2xl shadow-sm">
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
        )}

        {activeTab === "list" && (
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
                <p className="text-slate-500 font-medium">Henüz harcama yok</p>
                <p className="text-sm text-slate-400 mt-1">Yeni harcama ekleyerek başlayın.</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/deneyap/yeni">+ Yeni harcama ekle</Link>
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
                                <Link href={`/dashboard/deneyap/duzenle/${e.id}`}>
                                  <Send className="h-4 w-4 mr-2" /> Düzeltip Tekrar Gönder
                                </Link>
                              </Button>
                            )}
                            {e.status === "pending_bolge" && (
                              <>
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/dashboard/deneyap/duzenle/${e.id}`}>
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
          description={
            cancelTarget
              ? "Bu harcamayı iptal etmek istiyor musunuz?"
              : ""
          }
          confirmLabel="Evet, iptal et"
          variant="destructive"
          onConfirm={() => cancelTarget && handleCancelExpense(cancelTarget)}
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
