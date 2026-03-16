"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useExpensesRealtime } from "@/lib/realtime-expenses";
import type { Expense, ExpenseStatus, ExpenseType } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/expenses/status-badge";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MetricCard } from "@/components/dashboard/metric-card";
import { YkExpenseDetailModal } from "@/components/expenses/yk-expense-detail-modal";
import { BOLGELER_YK, BOLGE_ILLER } from "@/lib/bolge-iller";
import { REGION_LIMIT_SLUGS, regionToSlug } from "@/lib/region-names";
import { bolgeAdi, cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { LayoutDashboard, MapPin, List, TrendingUp, TrendingDown, ChevronDown, ChevronUp, X, BarChart2, CreditCard, Activity } from "lucide-react";

/** Tüm bölgeler (Bölgeler sekmesinde hepsini göstermek için) */
const TUM_BOLGE_SLUGS = [...REGION_LIMIT_SLUGS];
import { DASHBOARD_COLORS, CHART_COLORS, formatCurrencyTR } from "@/lib/dashboard-theme";
import { EXPENSE_FIELDS_FULL } from "@/lib/expense-fields";
import Link from "next/link";

type TimeFilter = "weekly" | "monthly" | "yearly" | "all";
type YkTab = "genel" | "bolgeler" | "harcamalar";

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  pending_bolge: "#D97706",
  pending_koord: "#64748B",
  approved_bolge: "#2563EB",
  rejected_bolge: "#DC2626",
  approved_koord: "#16A34A",
  rejected_koord: "#DC2626",
  paid: "#7C3AED",
  deleted: "#6B7280",
};
const STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending_bolge: "Bölge bekliyor",
  pending_koord: "TÇK bekliyor",
  approved_bolge: "Koord. bekliyor",
  rejected_bolge: "Red (bölge)",
  approved_koord: "Onaylandı",
  rejected_koord: "Red (koord)",
  paid: "Ödendi",
  deleted: "Silindi",
};
const EXPENSE_TYPES: ExpenseType[] = ["Ulaşım", "Konaklama", "Yemek", "Malzeme", "Diğer"];

const FILTER_STATUS_OPTIONS: { value: ExpenseStatus; label: string }[] = [
  { value: "pending_bolge", label: "Bekleyen (bölge)" },
  { value: "pending_koord", label: "Bekleyen (TÇK)" },
  { value: "approved_bolge", label: "Bölge Onaylı" },
  { value: "approved_koord", label: "Koordinatör Onaylı" },
  { value: "paid", label: "Ödendi" },
  { value: "rejected_bolge", label: "Reddedildi (bölge)" },
  { value: "rejected_koord", label: "Reddedildi (koord)" },
];

function getPeriodRange(period: TimeFilter): { start: Date; end: Date } | null {
  if (period === "all") return null;
  const end = new Date();
  const start = new Date();
  if (period === "weekly") start.setDate(start.getDate() - 7);
  else if (period === "monthly") start.setMonth(start.getMonth() - 1);
  else start.setFullYear(start.getFullYear() - 1);
  return { start, end };
}

export default function YkPage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<YkTab>("genel");
  const searchParams = useSearchParams();
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "genel" || t === "bolgeler" || t === "harcamalar") setActiveTab(t);
  }, [searchParams]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("monthly");
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Harcamalar tab
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterBolge, setFilterBolge] = useState<string>("all");
  const [filterIl, setFilterIl] = useState<string>("all");
  const [filterStatuses, setFilterStatuses] = useState<ExpenseStatus[]>([]);
  const [filterTypes, setFilterTypes] = useState<ExpenseType[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [personelSearch, setPersonelSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status" | "name">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [regionLimits, setRegionLimits] = useState<Record<string, number>>({});

  const periodRange = useMemo(() => getPeriodRange(timeFilter), [timeFilter]);

  const filteredByPeriod = useMemo(() => {
    if (!periodRange) return expenses;
    return expenses.filter((e) => {
      const d = new Date(e.created_at);
      return d >= periodRange.start && d <= periodRange.end;
    });
  }, [expenses, periodRange]);

  const totalAmount = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );
  const thisMonth = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((e) => {
        const d = new Date(e.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + Number(e.amount), 0);
  }, [expenses]);
  const lastMonth = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return expenses
      .filter((e) => {
        const d = new Date(e.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + Number(e.amount), 0);
  }, [expenses]);
  const monthChangePercent =
    lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : (thisMonth > 0 ? 100 : 0);

  const approvedCount = useMemo(
    () =>
      expenses.filter((e) =>
        ["approved_bolge", "approved_koord", "paid"].includes(e.status)
      ).length,
    [expenses]
  );
  const pendingCount = useMemo(
    () =>
      expenses.filter((e) =>
        ["pending_bolge", "pending_koord", "approved_bolge"].includes(e.status)
      ).length,
    [expenses]
  );
  const rejectedCount = useMemo(
    () =>
      expenses.filter((e) =>
        ["rejected_bolge", "rejected_koord"].includes(e.status)
      ).length,
    [expenses]
  );
  const bolgeTalebiCount = useMemo(
    () => expenses.filter((e) => e.status === "pending_koord").length,
    [expenses]
  );
  const paidTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.status === "paid")
        .reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  );
  const avgAmount =
    expenses.length > 0
      ? expenses.reduce((s, e) => s + Number(e.amount), 0) / expenses.length
      : 0;

  const monthlyTrendData = useMemo(() => {
    const months: { ay: string; toplam: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = new Intl.DateTimeFormat("tr-TR", {
        month: "short",
        year: "2-digit",
      }).format(d);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const total = expenses
        .filter((e) => {
          const t = new Date(e.created_at);
          return t >= start && t <= end;
        })
        .reduce((s, e) => s + Number(e.amount), 0);
      months.push({ ay: key, toplam: total });
    }
    return months;
  }, [expenses]);

  const statusPieData = useMemo(() => {
    const byStatus: Record<ExpenseStatus, number> = {} as Record<ExpenseStatus, number>;
    (
      [
        "pending_bolge",
        "pending_koord",
        "approved_bolge",
        "rejected_bolge",
        "approved_koord",
        "rejected_koord",
        "paid",
      ] as ExpenseStatus[]
    ).forEach((s) => (byStatus[s] = 0));
    expenses.forEach((e) => {
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    });
    return Object.entries(byStatus)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({
        name: STATUS_LABELS[status as ExpenseStatus],
        value,
        status: status as ExpenseStatus,
      }));
  }, [expenses]);

  const regionCards = useMemo(() => {
    const byRegion: Record<
      string,
      { toplam: number; count: number; approved: number; pending: number; rejected: number }
    > = {};
    expenses.forEach((e) => {
      const b = e.bolge || "Belirsiz";
      if (!byRegion[b]) {
        byRegion[b] = { toplam: 0, count: 0, approved: 0, pending: 0, rejected: 0 };
      }
      byRegion[b].toplam += Number(e.amount);
      byRegion[b].count += 1;
      if (["approved_bolge", "approved_koord", "paid"].includes(e.status))
        byRegion[b].approved += 1;
      else if (["pending_bolge", "pending_koord", "approved_bolge"].includes(e.status))
        byRegion[b].pending += 1;
      else byRegion[b].rejected += 1;
    });
    const maxToplam = Math.max(...Object.values(byRegion).map((r) => r.toplam), 1);
    const thisMonthDate = new Date();
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    return Object.entries(byRegion).map(([bolge, r]) => {
      const thisM = expenses.filter((e) => {
        if (e.bolge !== bolge) return false;
        const d = new Date(e.created_at);
        return d.getMonth() === thisMonthDate.getMonth() && d.getFullYear() === thisMonthDate.getFullYear();
      }).reduce((s, e) => s + Number(e.amount), 0);
      const lastM = expenses.filter((e) => {
        if (e.bolge !== bolge) return false;
        const d = new Date(e.created_at);
        return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
      }).reduce((s, e) => s + Number(e.amount), 0);
      const trend = lastM > 0 ? ((thisM - lastM) / lastM) * 100 : (thisM > 0 ? 100 : 0);
      return {
        bolge,
        ...r,
        ortalama: r.count > 0 ? r.toplam / r.count : 0,
        pct: (r.toplam / maxToplam) * 100,
        trend,
      };
    });
  }, [expenses]);

  const regionBarData = useMemo(() => {
    return regionCards.map((r) => ({
      bolge: r.bolge,
      Onaylanan: r.approved,
      Bekleyen: r.pending,
      Reddedilen: r.rejected,
    }));
  }, [regionCards]);

  const regionBarDataForChart = useMemo(() => {
    return regionCards.map((r) => ({
      bolge: bolgeAdi(r.bolge),
      Onaylanan: r.approved,
      Bekleyen: r.pending,
      Reddedilen: r.rejected,
    }));
  }, [regionCards]);

  /** Bölgeler sekmesi: tüm bölgeler, veri yoksa null */
  const allRegionEntries = useMemo(() => {
    return TUM_BOLGE_SLUGS.map((slug) => {
      const card = regionCards.find((r) => regionToSlug(r.bolge) === slug);
      return { slug, card };
    });
  }, [regionCards]);

  const thisMonthStart = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1), []);
  const thisMonthEnd = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59), []);
  const thisMonthSpentByRegion = useMemo(() => {
    const map: Record<string, number> = {};
    REGION_LIMIT_SLUGS.forEach((s) => (map[s] = 0));
    expenses
      .filter(
        (e) =>
          ["approved_koord", "paid"].includes(e.status) &&
          new Date(e.created_at) >= thisMonthStart &&
          new Date(e.created_at) <= thisMonthEnd
      )
      .forEach((e) => {
        const slug = regionToSlug(e.bolge);
        if (slug && map[slug] != null) map[slug] += Number(e.amount);
      });
    return map;
  }, [expenses, thisMonthStart, thisMonthEnd]);

  const ilList = useMemo(() => {
    const byIl: Record<
      string,
      { toplam: number; count: number; approved: number; pending: number; rejected: number }
    > = {};
    expenses.forEach((e) => {
      const il = e.il || "Belirsiz";
      if (!byIl[il]) {
        byIl[il] = { toplam: 0, count: 0, approved: 0, pending: 0, rejected: 0 };
      }
      byIl[il].toplam += Number(e.amount);
      byIl[il].count += 1;
      if (["approved_bolge", "approved_koord", "paid"].includes(e.status))
        byIl[il].approved += 1;
      else if (["pending_bolge", "pending_koord", "approved_bolge"].includes(e.status))
        byIl[il].pending += 1;
      else byIl[il].rejected += 1;
    });
    return Object.entries(byIl)
      .map(([il, r]) => ({ il, ...r }))
      .sort((a, b) => b.toplam - a.toplam);
  }, [expenses]);

  const ilOptions = useMemo(() => {
    if (filterBolge === "all") {
      return Array.from(new Set(expenses.map((e) => e.il).filter(Boolean))) as string[];
    }
    const iller = BOLGE_ILLER[filterBolge];
    if (iller) return iller;
    return Array.from(new Set(expenses.filter((e) => e.bolge === filterBolge).map((e) => e.il).filter(Boolean))) as string[];
  }, [expenses, filterBolge]);

  const tableExpenses = useMemo(() => {
    let list = [...expenses];
    if (filterBolge !== "all") list = list.filter((e) => (e.bolge ?? "").toLowerCase() === filterBolge.toLowerCase());
    if (filterIl !== "all") list = list.filter((e) => (e.il ?? "").toLowerCase() === filterIl.toLowerCase());
    if (filterStatuses.length > 0) list = list.filter((e) => filterStatuses.includes(e.status));
    if (filterTypes.length > 0) list = list.filter((e) => filterTypes.includes(e.expense_type));
    if (dateFrom) list = list.filter((e) => e.created_at >= dateFrom);
    if (dateTo) list = list.filter((e) => e.created_at.slice(0, 10) <= dateTo);
    const min = amountMin.trim() ? Number(amountMin) : NaN;
    const max = amountMax.trim() ? Number(amountMax) : NaN;
    if (!Number.isNaN(min)) list = list.filter((e) => Number(e.amount) >= min);
    if (!Number.isNaN(max)) list = list.filter((e) => Number(e.amount) <= max);
    const search = personelSearch.trim().toLowerCase();
    if (search) list = list.filter((e) => e.submitter_name?.toLowerCase().includes(search));
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === "amount") cmp = Number(a.amount) - Number(b.amount);
      else if (sortBy === "status") cmp = String(a.status).localeCompare(String(b.status));
      else cmp = (a.submitter_name ?? "").localeCompare(b.submitter_name ?? "");
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [
    expenses,
    filterBolge,
    filterIl,
    filterStatuses,
    filterTypes,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    personelSearch,
    sortBy,
    sortAsc,
  ]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterBolge !== "all") n += 1;
    if (filterIl !== "all") n += 1;
    n += filterStatuses.length;
    n += filterTypes.length;
    if (dateFrom) n += 1;
    if (dateTo) n += 1;
    if (amountMin.trim()) n += 1;
    if (amountMax.trim()) n += 1;
    if (personelSearch.trim()) n += 1;
    return n;
  }, [filterBolge, filterIl, filterStatuses, filterTypes, dateFrom, dateTo, amountMin, amountMax, personelSearch]);

  function clearFilters() {
    setFilterBolge("all");
    setFilterIl("all");
    setFilterStatuses([]);
    setFilterTypes([]);
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setPersonelSearch("");
  }

  function toggleStatus(s: ExpenseStatus) {
    setFilterStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }
  function toggleType(t: ExpenseType) {
    setFilterTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  const uniqueBolgeler = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.bolge).filter(Boolean))) as string[],
    [expenses]
  );

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("expenses")
      .select(EXPENSE_FIELDS_FULL)
      .order("created_at", { ascending: false });
    setExpenses((data ?? []) as Expense[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useExpensesRealtime(supabase, { filter: null, refetch });

  useEffect(() => {
    const fetchLimits = async () => {
      const { data } = await supabase.from("region_limits").select("bolge, monthly_limit");
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: { bolge: string; monthly_limit: number }) => {
        map[r.bolge] = Number(r.monthly_limit);
      });
      setRegionLimits(map);
    };
    fetchLimits();
  }, [supabase]);

  useEffect(() => {
    if (filterBolge === "all") return;
    setFilterIl("all");
  }, [filterBolge]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-[430px] md:max-w-none mx-auto">
      <div className="flex-1 pb-20">
        <h1 className="text-lg font-semibold text-slate-800 mb-4 md:hidden">YK Başkanı</h1>

        {activeTab === "genel" && (
          <div className="space-y-4">
            {/* Hero: mobilde mevcut kart, md+ büyük hero */}
            <div className="rounded-2xl shadow-sm border border-slate-100 bg-gradient-to-br from-[#2563EB]/10 to-white p-4 md:hidden">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Toplam harcama (tüm zamanlar)</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalAmount)}</p>
              <div className="flex items-center gap-2 mt-2 text-sm">
                {monthChangePercent >= 0 ? <TrendingUp className="h-4 w-4 text-[#16A34A]" /> : <TrendingDown className="h-4 w-4 text-[#DC2626]" />}
                <span className={monthChangePercent >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}>
                  Bu ay {formatCurrency(thisMonth)} · Geçen aya göre {monthChangePercent >= 0 ? "+" : ""}{monthChangePercent.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="hidden md:flex md:flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-gray-200">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Toplam Harcama</p>
                <p className="text-3xl lg:text-4xl font-bold text-gray-900 mt-0.5">{formatCurrency(totalAmount)}</p>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <span className={monthChangePercent >= 0 ? "text-[#059669]" : "text-[#DC2626]"}>
                    Bu ay: {formatCurrency(thisMonth)} · Geçen aya göre {monthChangePercent >= 0 ? "+" : ""}{monthChangePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {([["weekly", "Haftalık"], ["monthly", "Aylık"], ["yearly", "Yıllık"], ["all", "Tümü"]] as [TimeFilter, string][]).map(([key, label]) => (
                  <Button key={key} variant={timeFilter === key ? "default" : "outline"} size="sm" onClick={() => setTimeFilter(key)} className="rounded-full">
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap md:hidden">
              {(["weekly", "monthly", "yearly", "all"] as const).map((key) => (
                <Button key={key} variant={timeFilter === key ? "default" : "outline"} size="sm" onClick={() => setTimeFilter(key)}>
                  {key === "weekly" ? "Haftalık" : key === "monthly" ? "Aylık" : key === "yearly" ? "Yıllık" : "Tümü"}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard title="Toplam Harcama (₺)" value={formatCurrency(totalAmount)} borderColor="primary" />
              <MetricCard
                title="Onaylanan / Bekleyen / Reddedilen"
                value={`${approvedCount} / ${pendingCount} / ${rejectedCount}`}
                borderColor="success"
              />
              <MetricCard title="Ödenen Toplam (₺)" value={formatCurrency(paidTotal)} borderColor="purple" />
              <MetricCard title="Ortalama Harcama (₺)" value={formatCurrency(avgAmount)} borderColor="warning" />
            </div>

            {monthlyTrendData.some((d) => d.toplam > 0) && (
              <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-3">Aylık Harcama Trendi</h3>
                  <div className="h-52 md:h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrendData} margin={{ top: 8, right: 8, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="ykArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={DASHBOARD_COLORS.primary} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={DASHBOARD_COLORS.primary} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyTR(v)} />
                        <Tooltip formatter={(v: number) => [formatCurrencyTR(v), "Tutar"]} contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                        <Area type="monotone" dataKey="toplam" stroke={DASHBOARD_COLORS.primary} strokeWidth={2} fill="url(#ykArea)" fillOpacity={0.15} dot={{ r: 4 }} isAnimationActive />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {statusPieData.length > 0 && (
              <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-3">Durum Dağılımı</h3>
                  <div className="h-56 md:h-[280px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          label={false}
                        >
                          {statusPieData.map((d) => (
                            <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string, props: { payload?: { name: string; value: number } }) => {
                          const total = expenses.length;
                          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                          return `${props.payload?.name ?? name}: ${value} (%${pct})`;
                        }} contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                        <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-1">Toplam {expenses.length} harcama</p>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm md:text-[14px] font-semibold text-[#374151]">Son Aktiviteler</h3>
                  <Link href="/dashboard/yk?tab=harcamalar" className="text-xs font-medium text-[#1E40AF] hover:underline hidden md:inline">Tümünü gör</Link>
                </div>
                {expenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Activity className="h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">Henüz aktivite yok.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {expenses.slice(0, 5).map((e) => (
                      <li
                        key={e.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setDetailExpense(e); setDetailOpen(true); }}
                        onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setDetailExpense(e); setDetailOpen(true); } }}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm border-b border-gray-100 pb-2 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        <span className="font-medium">{e.expense_number}</span>
                        <span className="text-slate-600">{e.submitter_name}</span>
                        <span className="text-slate-600">{formatCurrency(e.amount)}</span>
                        <StatusBadge status={e.status} />
                        <span className="text-slate-400 text-xs w-full">{formatDate(e.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "bolgeler" && (
          <div className="space-y-4 md:max-w-5xl md:mx-auto md:px-6 lg:px-10">
            <div className="hidden md:block mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Bölge Analizi</h2>
              <p className="text-sm text-gray-500 mt-0.5">Tüm bölgelerin harcama ve durum özeti</p>
            </div>

            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3 md:space-y-0">
              {allRegionEntries.map(({ slug, card }) => {
                const limit = regionLimits[slug] ?? 0;
                const spent = thisMonthSpentByRegion[slug] ?? 0;
                const limitPct = limit > 0 ? (spent / limit) * 100 : 0;
                const overLimit = limit > 0 && spent >= limit;
                const name = bolgeAdi(slug);
                if (!card) {
                  return (
                    <Card key={slug} className="rounded-2xl shadow-sm border-dashed border-slate-200">
                      <CardContent className="p-4 space-y-2 flex flex-col items-center justify-center min-h-[140px]">
                        <span className="font-medium md:text-xl md:font-bold text-slate-800">{name}</span>
                        <p className="text-sm text-slate-500 text-center">Bu bölgede henüz harcama yapılmadı</p>
                      </CardContent>
                    </Card>
                  );
                }
                const r = card;
                return (
                  <Card
                    key={slug}
                    className={`rounded-2xl shadow-sm ${overLimit ? "border-2 border-red-400" : ""}`}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-medium md:text-xl md:font-bold text-slate-800">{name}</span>
                        {overLimit && (
                          <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                            LİMİT AŞILDI
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-sm md:block">
                        <span className="font-semibold text-slate-800 md:text-3xl md:font-bold md:text-blue-700">{formatCurrency(r.toplam)}</span>
                      </div>
                      {limit > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600">
                            Bu ay: {formatCurrency(spent)} / Limit: {formatCurrency(limit)}
                          </p>
                          <div className="h-2 md:h-3 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${overLimit ? "bg-red-500" : limitPct >= 90 ? "bg-orange-500" : limitPct >= 70 ? "bg-amber-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(limitPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="h-2 md:h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2563EB]"
                          style={{ width: `${r.pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 md:flex-col md:gap-1">
                        <span className="flex items-center gap-1.5 md:flex-initial">
                          <List className="h-3.5 w-3.5 hidden md:inline text-slate-400" />
                          {r.count} harcama
                        </span>
                        <span className="flex items-center gap-1.5 md:flex-initial">
                          <BarChart2 className="h-3.5 w-3.5 hidden md:inline text-slate-400" />
                          Ort. {formatCurrency(r.ortalama)}
                        </span>
                        <span className={cn(
                          "flex items-center gap-0.5 md:inline-flex md:rounded-full md:px-2 md:py-0.5 md:text-xs md:font-medium md:mt-1",
                          r.trend >= 0 ? "text-[#16A34A] md:bg-green-100 md:text-green-800" : "text-[#DC2626] md:bg-red-100 md:text-red-800"
                        )}>
                          {r.trend >= 0 ? <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5" /> : <TrendingDown className="h-3 w-3 md:h-3.5 md:w-3.5" />}
                          {r.trend >= 0 ? "+" : ""}
                          {r.trend.toFixed(0)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {regionBarData.length > 0 && (
              <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-0.5">
                    Bölge · Durum (adet)
                  </h3>
                  <p className="text-xs text-gray-500 mb-3 hidden md:block">Onaylanan, bekleyen ve reddedilen harcama dağılımı</p>
                  <div className="h-56 md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={regionBarDataForChart}
                        margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
                      >
                        <XAxis dataKey="bolge" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Onaylanan" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Bekleyen" stackId="a" fill="#D97706" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Reddedilen" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <h3 className="text-sm font-medium text-slate-700 p-3 bg-slate-50 md:text-[14px] md:font-semibold md:text-[#374151]">
                İl bazlı özet (en çok harcayan üstte)
              </h3>
              <ul className="divide-y divide-slate-100">
                {ilList.length === 0 ? (
                  <li className="p-4 text-sm text-slate-500 text-center">
                    Veri yok.
                  </li>
                ) : (
                  ilList.map((row) => (
                    <li
                      key={row.il}
                      className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm md:flex-nowrap md:items-center md:gap-4"
                    >
                      <span className="font-medium md:font-bold w-full md:w-auto md:min-w-[100px]">{row.il}</span>
                      <span className="text-slate-800 md:font-bold md:text-blue-700 md:ml-auto">{formatCurrency(row.toplam)}</span>
                      <span className="text-slate-500 md:rounded-full md:bg-gray-100 md:px-2 md:py-0.5 md:text-xs">{row.count} adet</span>
                      <span className="flex gap-1 text-xs md:flex md:gap-2 md:flex-wrap md:justify-end">
                        <span className="rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-xs font-medium hidden md:inline">{row.approved} onaylı</span>
                        <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-xs font-medium hidden md:inline">{row.pending} bekliyor</span>
                        <span className="rounded bg-red-100 text-red-800 px-1.5 py-0.5 text-xs font-medium hidden md:inline">{row.rejected} reddedildi</span>
                        <span className="flex gap-1 text-xs md:hidden">
                          <span className="text-[#16A34A]">O:{row.approved}</span>
                          <span className="text-[#D97706]">B:{row.pending}</span>
                          <span className="text-[#DC2626]">R:{row.rejected}</span>
                        </span>
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === "harcamalar" && (
          <div className="space-y-4">
            {/* Filtre özeti */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#2563EB] text-white text-xs font-medium px-3 py-1">
                  {activeFilterCount} filtre aktif
                </span>
                <Button variant="ghost" size="sm" className="text-slate-600 h-8" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Temizle
                </Button>
              </div>
            )}

            {/* Collapsible Filtreler */}
            <Card className="rounded-2xl shadow-sm overflow-hidden">
              <button
                type="button"
                className="w-full p-4 flex items-center justify-between text-left"
                onClick={() => setFiltersOpen((o) => !o)}
              >
                <span className="text-sm font-medium text-slate-700">Filtreler</span>
                <span className="text-sm text-[#2563EB] font-medium">
                  {filtersOpen ? "Gizle" : "Göster"}
                </span>
                {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  filtersOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Bölge</Label>
                        <Select value={filterBolge} onValueChange={setFilterBolge}>
                          <SelectTrigger className="h-9 mt-0.5">
                            <SelectValue placeholder="Tümü" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tümü</SelectItem>
                            {BOLGELER_YK.map((b) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">İl</Label>
                        <Select value={filterIl} onValueChange={setFilterIl}>
                          <SelectTrigger className="h-9 mt-0.5">
                            <SelectValue placeholder="Tümü" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tümü</SelectItem>
                            {ilOptions.map((il) => (
                              <SelectItem key={il} value={il}>{il}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs block mb-1.5">Durum (çoklu)</Label>
                      <div className="flex flex-wrap gap-2">
                        {FILTER_STATUS_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filterStatuses.includes(opt.value)}
                              onChange={() => toggleStatus(opt.value)}
                              className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                            />
                            <span className="text-slate-700">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs block mb-1.5">Harcama türü (çoklu)</Label>
                      <div className="flex flex-wrap gap-2">
                        {EXPENSE_TYPES.map((t) => (
                          <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filterTypes.includes(t)}
                              onChange={() => toggleType(t)}
                              className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                            />
                            <span className="text-slate-700">{t}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Başlangıç</Label>
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-xs">Bitiş</Label>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 mt-0.5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Min ₺</Label>
                        <Input type="number" min={0} placeholder="0" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} className="h-9 mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-xs">Max ₺</Label>
                        <Input type="number" min={0} placeholder="—" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} className="h-9 mt-0.5" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Personel adı</Label>
                      <Input placeholder="Ara..." value={personelSearch} onChange={(e) => setPersonelSearch(e.target.value)} className="h-9 mt-0.5" />
                    </div>
                  </div>
              </div>
            </Card>

            {/* Sıralama */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Sırala:</span>
              {(["date", "amount", "status", "name"] as const).map((key) => (
                <Button
                  key={key}
                  variant={sortBy === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSortBy(key); setSortAsc((x) => !x); }}
                >
                  {key === "date" ? "Tarih" : key === "amount" ? "Tutar" : key === "status" ? "Durum" : "İsim"}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setSortAsc((x) => !x)}>
                {sortAsc ? "↑ Artan" : "↓ Azalan"}
              </Button>
            </div>

            {/* Sonuç sayısı */}
            <p className="text-sm text-slate-600">
              {tableExpenses.length} harcama bulundu
            </p>

            <ul className="space-y-2">
              {tableExpenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500 shadow-sm">
                  Filtreye uygun harcama yok.
                </div>
              ) : (
                tableExpenses.map((e) => (
                  <Card
                    key={e.id}
                    className="rounded-2xl shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => { setDetailExpense(e); setDetailOpen(true); }}
                  >
                    <CardContent className="p-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-slate-500 w-full">{e.expense_number}</span>
                      <span className="font-medium">{e.submitter_name}</span>
                      <span className="text-slate-500">{e.il} · {bolgeAdi(e.bolge)}</span>
                      <span className="text-slate-500">{e.expense_type}</span>
                      <span className="font-semibold text-slate-800 ml-auto">{formatCurrency(e.amount)}</span>
                      <StatusBadge status={e.status} />
                      <span className="text-slate-400 text-xs w-full">{formatDate(e.created_at)}</span>
                    </CardContent>
                  </Card>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      <BottomNav
        tabs={[
          { id: "genel", label: "Genel", icon: LayoutDashboard },
          { id: "bolgeler", label: "Bölgeler", icon: MapPin },
          { id: "harcamalar", label: "Harcamalar", icon: List },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as YkTab)}
      />

      <YkExpenseDetailModal
        expense={detailExpense}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
