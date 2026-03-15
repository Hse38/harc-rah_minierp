"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useExpensesRealtime } from "@/lib/realtime-expenses";
import type { Expense } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseCard } from "@/components/expenses/expense-card";
import { StatusBadge } from "@/components/expenses/status-badge";
import { BottomNav } from "@/components/layout/bottom-nav";
import { formatCurrency } from "@/lib/utils";
import type { ExpenseStatus } from "@/types";
import { BarChart2, List, Plus } from "lucide-react";
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

const PIE_COLORS = ["#2563EB", "#22C55E", "#EAB308", "#F97316", "#64748B"];

export default function IlPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ il?: string } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "list">("dashboard");
  const searchParams = useSearchParams();
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "dashboard" || t === "list") setActiveTab(t);
  }, [searchParams]);

  const il = profile?.il ?? "";

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("il")
        .eq("id", user.id)
        .single();
      setProfile(p as { il?: string } | null);
    })();
  }, [supabase]);

  const refetch = useCallback(async () => {
    if (!il) return;
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("il", il)
      .order("created_at", { ascending: false });
    setExpenses((data ?? []) as Expense[]);
    setLoading(false);
  }, [il, supabase]);

  useEffect(() => {
    if (!il) return;
    refetch();
  }, [il, refetch]);

  useExpensesRealtime(supabase, {
    filter: il ? { column: "il", value: il } : undefined,
    refetch,
  });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const thisMonthTotal = useMemo(
    () =>
      expenses
        .filter((e) => {
          const d = new Date(e.created_at);
          return d >= thisMonthStart && d <= thisMonthEnd;
        })
        .reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );
  const pendingCount = useMemo(
    () => expenses.filter((e) => e.status === "pending_bolge").length,
    [expenses]
  );
  const personnelList = useMemo(() => {
    const byName: Record<string, { toplam: number; status: string }> = {};
    expenses
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .forEach((e) => {
        const name = e.submitter_name || "Belirsiz";
        if (!byName[name]) byName[name] = { toplam: 0, status: e.status };
        byName[name].toplam += Number(e.amount);
      });
    return Object.entries(byName).map(([name, d]) => ({ name, ...d }));
  }, [expenses]);
  const typeData = useMemo(() => {
    const types = ["Ulaşım", "Konaklama", "Yemek", "Malzeme", "Diğer"];
    const byType: Record<string, number> = {};
    types.forEach((t) => (byType[t] = 0));
    expenses.forEach((e) => {
      const t = e.expense_type || "Diğer";
      byType[t] = (byType[t] ?? 0) + Number(e.amount);
    });
    return Object.entries(byType)
      .filter(([, v]) => v > 0)
      .map(([tür, toplam]) => ({ tür, toplam }));
  }, [expenses]);

  if (loading && !il) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-20">
        <h1 className="text-lg font-semibold text-slate-800 mb-4">İl Sorumlusu</h1>

        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">İldeki toplam harcama (bu ay)</p>
                  <p className="text-xl font-bold text-slate-800">{formatCurrency(thisMonthTotal)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Personel sayısı</p>
                  <p className="text-xl font-bold text-slate-800">{personnelList.length}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm col-span-2">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">Bekleyen onay</p>
                  <p className="text-xl font-bold text-[#D97706]">{pendingCount}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Personel bazlı harcama</h3>
                {personnelList.length === 0 ? (
                  <p className="text-sm text-slate-500 py-2">Veri yok.</p>
                ) : (
                  <ul className="space-y-2">
                    {personnelList.map((p) => (
                      <li
                        key={p.name}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0"
                      >
                        <span className="font-medium text-slate-800">{p.name}</span>
                        <span className="text-sm text-slate-600">{formatCurrency(p.toplam)}</span>
                        <StatusBadge status={p.status as ExpenseStatus} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {typeData.length > 0 && (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Harcama türü dağılımı</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeData}
                          dataKey="toplam"
                          nameKey="tür"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={55}
                          paddingAngle={2}
                          label={({ tür, toplam }) => `${tür}: ${formatCurrency(toplam)}`}
                        >
                          {typeData.map((_, i) => (
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
          </div>
        )}

        {activeTab === "list" && (
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500 shadow-sm">
                Bu ile ait harcama kaydı yok.
              </div>
            ) : (
              <ul className="space-y-3">
                {expenses.map((e) => (
                  <li key={e.id}>
                    <ExpenseCard expense={e} showSubmitter />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <BottomNav
        tabs={[
          { id: "dashboard", label: "Dashboard", icon: BarChart2 },
          { id: "list", label: "Harcamalar", icon: List },
          { id: "yeni", label: "Yeni", icon: Plus, href: "/dashboard/il/yeni" },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => tab !== "yeni" && setActiveTab(tab as "dashboard" | "list")}
      />
    </div>
  );
}
