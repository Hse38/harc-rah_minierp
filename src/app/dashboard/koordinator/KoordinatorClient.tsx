"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useExpensesRealtime } from "@/lib/realtime-expenses";
import type { Expense } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/expenses/status-badge";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MetricCard } from "@/components/dashboard/metric-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { checkLimitAfterApprove } from "@/lib/check-limit";
import { REGION_LIMIT_SLUGS, regionToSlug, regionToTurkish } from "@/lib/region-names";
import { ApprovalModal } from "@/components/approval/approval-modal";
import { ReceiptLightbox } from "@/components/expenses/receipt-lightbox";
import { Check, X, BarChart2, Clock, CheckCircle, FileImage, Wallet, Pencil, ChevronRight, Activity } from "lucide-react";
import { toast } from "sonner";
import { sendPushFromClient } from "@/lib/push-notifications";
import { getRecipientIds } from "@/lib/notification-recipients";
import type { DashboardKoordinatorResponse } from "@/lib/dashboard-data";

const KoordinatorCharts = dynamic(
  () => import("@/components/dashboard/KoordinatorCharts").then((m) => ({ default: m.KoordinatorCharts })),
  { ssr: false, loading: () => <div className="h-52 animate-pulse bg-gray-100 rounded-xl" /> }
);

type PeriodFilter = "weekly" | "monthly" | "yearly";

const BOLGELER = ["marmara", "ege", "karadeniz", "iç anadolu", "akdeniz", "doğu anadolu", "güneydoğu anadolu"];
const EXPENSE_FIELDS_KOORD =
  "id,expense_number,submitter_id,submitter_name,iban,il,bolge,expense_type,amount,description,receipt_url,ai_analysis,status,bolge_note,bolge_warning,reviewed_by_bolge,reviewed_by_koord,reviewed_at_bolge,reviewed_at_koord,created_at";

function getPeriodRange(period: PeriodFilter): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (period === "weekly") start.setDate(start.getDate() - 7);
  else if (period === "monthly") start.setMonth(start.getMonth() - 1);
  else start.setFullYear(start.getFullYear() - 1);
  return { start, end };
}

export function KoordinatorClient({
  initialData,
}: {
  initialData?: DashboardKoordinatorResponse | null;
}) {
  const supabase = createClient();
  const [allExpenses, setAllExpenses] = useState<Expense[]>(initialData?.expenses ?? []);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("monthly");
  const [activeTab, setActiveTab] = useState<"dashboard" | "awaiting" | "completed" | "limits">("dashboard");
  const [regionLimits, setRegionLimits] = useState<Record<string, number>>(initialData?.regionLimits ?? {});
  const [limitUpdating, setLimitUpdating] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState("");
  const editCardRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const [rejectModal, setRejectModal] = useState<Expense | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptLightbox, setReceiptLightbox] = useState<{ url: string; bolgeNote: string | null } | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "dashboard" || t === "awaiting" || t === "completed" || t === "limits") setActiveTab(t);
  }, [searchParams]);

  const { start: periodStart, end: periodEnd } = useMemo(() => getPeriodRange(periodFilter), [periodFilter]);

  const periodExpenses = useMemo(
    () =>
      allExpenses.filter((e) => {
        const d = new Date(e.created_at);
        return d >= periodStart && d <= periodEnd;
      }),
    [allExpenses, periodStart, periodEnd]
  );

  const awaiting = useMemo(
    () => allExpenses.filter((e) => e.status === "approved_bolge" || e.status === "pending_koord"),
    [allExpenses]
  );
  const completed = useMemo(
    () =>
      allExpenses
        .filter((e) => ["approved_koord", "paid", "rejected_koord"].includes(e.status))
        .sort((a, b) => {
          const ta = (a.reviewed_at_koord || a.created_at) ?? "";
          const tb = (b.reviewed_at_koord || b.created_at) ?? "";
          return new Date(tb).getTime() - new Date(ta).getTime();
        }),
    [allExpenses]
  );

  const approvedTotalAllTime = useMemo(
    () =>
      allExpenses
        .filter((e) => ["approved_bolge", "approved_koord", "paid"].includes(e.status))
        .reduce((s, e) => s + Number(e.amount), 0),
    [allExpenses]
  );
  const periodApprovedCount = useMemo(
    () =>
      periodExpenses.filter((e) =>
        ["approved_bolge", "approved_koord", "paid"].includes(e.status)
      ).length,
    [periodExpenses]
  );
  const rejectedCount = useMemo(
    () => allExpenses.filter((e) => e.status === "rejected_koord").length,
    [allExpenses]
  );

  const regionTrendData = useMemo(() => {
    const months: Record<string, Record<string, number>> = {};
    const orderedKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit" }).format(d);
      orderedKeys.push(key);
      months[key] = {};
      BOLGELER.forEach((b) => (months[key][b] = 0));
    }
    allExpenses.forEach((e) => {
      const d = new Date(e.created_at);
      const key = new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit" }).format(d);
      const bolge = (e.bolge || "").toLowerCase().replace(/\s/g, "");
      const match = BOLGELER.find((b) => b.replace(/\s/g, "").toLowerCase() === bolge);
      if (match && months[key]) {
        months[key][match] = (months[key][match] ?? 0) + Number(e.amount);
      }
    });
    return orderedKeys.map((k) => ({ ay: k, ...months[k] }));
  }, [allExpenses]);

  const approvalTimeByRegion = useMemo(() => {
    const byRegion: Record<string, number[]> = {};
    allExpenses
      .filter((e) => e.reviewed_at_bolge && e.bolge)
      .forEach((e) => {
        const created = new Date(e.created_at).getTime();
        const reviewed = new Date(e.reviewed_at_bolge!).getTime();
        const hours = (reviewed - created) / (1000 * 60 * 60);
        const b = e.bolge!;
        if (!byRegion[b]) byRegion[b] = [];
        byRegion[b].push(hours);
      });
    return Object.entries(byRegion).map(([bolge, hours]) => ({
      bolge: regionToTurkish(bolge),
      ortalamaSaat: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0,
    }));
  }, [allExpenses]);

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

  const last5Activities = useMemo(
    () =>
      completed
        .filter((e) => e.reviewed_at_koord)
        .slice(0, 5)
        .map((e) => ({
          ...e,
          actionDate: e.reviewed_at_koord || e.created_at,
        })),
    [completed]
  );

  const pendingBolgeCount = useMemo(() => allExpenses.filter((e) => e.status === "pending_bolge").length, [allExpenses]);
  const paymentAwaitingCount = useMemo(() => allExpenses.filter((e) => e.status === "approved_koord").length, [allExpenses]);
  const [profile, setProfile] = useState<{ full_name?: string } | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setProfile((p as { full_name?: string } | null) ?? null);
    })();
  }, [supabase]);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("expenses")
      .select(EXPENSE_FIELDS_KOORD)
      .order("created_at", { ascending: false })
      .limit(500);
    setAllExpenses((data ?? []) as Expense[]);
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
    if (!editingSlug) return;
    const onDocClick = (e: MouseEvent) => {
      if (editCardRef.current && !editCardRef.current.contains(e.target as Node)) setEditingSlug(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [editingSlug]);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const thisMonthSpentByRegion = useMemo(() => {
    const map: Record<string, number> = {};
    REGION_LIMIT_SLUGS.forEach((s) => (map[s] = 0));
    allExpenses
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
  }, [allExpenses]);

  const limitsBanner = useMemo(() => {
    let over100 = 0;
    let over90 = 0;
    REGION_LIMIT_SLUGS.forEach((slug) => {
      const limit = regionLimits[slug];
      const spent = thisMonthSpentByRegion[slug] ?? 0;
      if (limit != null && limit > 0) {
        const pct = (spent / limit) * 100;
        if (pct >= 100) over100++;
        else if (pct >= 90) over90++;
      }
    });
    if (over100 > 0) return { type: "red" as const, text: `🚨 ${over100} bölge(ler) bu ay limitini aştı!` };
    if (over90 > 0) return { type: "amber" as const, text: `⚠️ ${over90} bölge limite yaklaşıyor` };
    return { type: "green" as const, text: "Tüm bölgeler limit dahilinde ✓" };
  }, [regionLimits, thisMonthSpentByRegion]);

  async function handleSaveLimit(slug: string, value: number) {
    setLimitUpdating(slug);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updated_at = new Date().toISOString();
      const { data: existing } = await supabase.from("region_limits").select("id").eq("bolge", slug).single();
      if (existing) {
        await supabase.from("region_limits").update({ monthly_limit: value, set_by: user?.id ?? null, updated_at }).eq("bolge", slug);
      } else {
        await supabase.from("region_limits").insert({ bolge: slug, monthly_limit: value, set_by: user?.id ?? null, updated_at });
      }
      setRegionLimits((prev) => ({ ...prev, [slug]: value }));
      setEditingSlug(null);
      toast.success(`${regionToTurkish(slug)} limiti güncellendi.`);
    } catch {
      toast.error("Güncellenemedi.");
    } finally {
      setLimitUpdating(null);
    }
  }

  async function handleApprove(expense: Expense) {
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("expenses")
        .update({
          status: "approved_koord",
          reviewed_by_koord: user.id,
          reviewed_at_koord: new Date().toISOString(),
        })
        .eq("id", expense.id);
      const muhasebeIds = await getRecipientIds(supabase, { role: "muhasebe" });
      const approveNotifications: { recipient_id: string; message: string; expense_id: string }[] = [
        ...muhasebeIds.map((recipient_id) => ({
          recipient_id,
          message: `[${expense.expense_number}] ödemeye hazır.`,
          expense_id: expense.id,
        })),
        {
          recipient_id: expense.submitter_id,
          message: `[${expense.expense_number}] onaylandı.`,
          expense_id: expense.id,
        },
      ];
      if (approveNotifications.length > 0) {
        await supabase.from("notifications").insert(approveNotifications);
      }
      sendPushFromClient({
        recipient_role: "muhasebe",
        expense_id: expense.id,
        title: "Yeni ödeme bekliyor",
        body: `${expense.expense_number} ödemeye hazır`,
        url: "/dashboard/muhasebe",
      });
      sendPushFromClient({
        recipient_id: expense.submitter_id,
        title: "Harcamanız onaylandı",
        body: `${expense.expense_number} ödeme yapılacak`,
        url: "/dashboard/deneyap",
      });
      setAllExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? { ...e, status: "approved_koord" as const } : e))
      );
      toast.success("Onaylandı.");
      checkLimitAfterApprove(supabase, { ...expense, status: "approved_koord" }).then((r) => {
        if (r.notified && r.message) {
          sendPushFromClient({
            recipient_role: "koordinator",
            title: "Bölge limiti uyarısı",
            body: r.message,
            url: "/dashboard/koordinator",
          });
          sendPushFromClient({
            recipient_role: "yk",
            title: "Bölge limiti uyarısı",
            body: r.message,
            url: "/dashboard/yk",
          });
        }
      }).catch(() => {});
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(expense: Expense) {
    setActionLoading(true);
    try {
      await supabase.from("expenses").update({ status: "rejected_koord" }).eq("id", expense.id);
      await supabase.from("notifications").insert({
        recipient_id: expense.submitter_id,
        message: `[${expense.expense_number}] koordinatör tarafından reddedildi.`,
        expense_id: expense.id,
      });
      sendPushFromClient({
        recipient_id: expense.submitter_id,
        title: "Harcama reddedildi",
        body: `${expense.expense_number} koordinatör tarafından reddedildi`,
        url: "/dashboard/deneyap",
      });
      setRejectModal(null);
      setAllExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? { ...e, status: "rejected_koord" as const } : e))
      );
      toast.success("Reddedildi.");
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setActionLoading(false);
    }
  }

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
        <h1 className="text-lg font-semibold text-slate-800 mb-4 md:hidden">Koordinatör</h1>

        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <div className="hidden md:flex md:flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-gray-200">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Genel Bakış</h1>
                <p className="text-sm text-gray-500 mt-0.5">Tüm Türkiye • {profile?.full_name ?? ""}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {(["weekly", "monthly", "yearly"] as const).map((key) => (
                  <Button
                    key={key}
                    variant={periodFilter === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPeriodFilter(key)}
                    className="rounded-full"
                  >
                    {key === "weekly" ? "Haftalık" : key === "monthly" ? "Aylık" : "Yıllık"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 md:hidden">
              {(["weekly", "monthly", "yearly"] as const).map((key) => (
                <Button
                  key={key}
                  variant={periodFilter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriodFilter(key)}
                >
                  {key === "weekly" ? "Haftalık" : key === "monthly" ? "Aylık" : "Yıllık"}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard
                title="Toplam Onaylanan (₺)"
                value={formatCurrency(approvedTotalAllTime)}
                borderColor="success"
              />
              <MetricCard
                title="Bekleyen Onay"
                value={awaiting.length}
                borderColor="warning"
                className={awaiting.length >= 5 ? "ring-1 ring-red-200" : ""}
                trend={awaiting.length >= 5 ? { text: "Acil" } : undefined}
              />
              <MetricCard title="Bu Dönem Onaylanan" value={periodApprovedCount} borderColor="primary" />
              <MetricCard title="Reddedilen" value={rejectedCount} borderColor="danger" />
            </div>

            {/* Onay süreci özeti (funnel) - md+ */}
            <div className="hidden md:block">
              <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-3">Onay Süreci Özeti</h3>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <a href="/dashboard/koordinator?tab=awaiting" className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 min-w-[120px] hover:bg-gray-100 transition">
                      <span className="text-2xl font-bold text-[#D97706]">{pendingBolgeCount}</span>
                      <span className="text-xs text-gray-600 mt-0.5">Bölge Bekleyen</span>
                    </a>
                    <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                    <a href="/dashboard/koordinator?tab=awaiting" className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 min-w-[120px] hover:bg-gray-100 transition">
                      <span className="text-2xl font-bold text-[#1E40AF]">{awaiting.length}</span>
                      <span className="text-xs text-gray-600 mt-0.5">Koordinatör Bekleyen</span>
                    </a>
                    <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 min-w-[120px]">
                      <span className="text-2xl font-bold text-[#059669]">{paymentAwaitingCount}</span>
                      <span className="text-xs text-gray-600 mt-0.5">Ödeme Bekleyen</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <KoordinatorCharts
              regionTrendData={regionTrendData}
              approvalTimeByRegion={approvalTimeByRegion}
              typeChartData={typeChartData}
            />

            <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
              <CardContent className="p-4 md:p-5">
                <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-3">Son Aktiviteler</h3>
                {last5Activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Activity className="h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">Henüz işlem yapılmadı</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {last5Activities.map((e) => (
                      <li
                        key={e.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0 text-sm"
                      >
                        <span className="font-medium">{e.expense_number}</span>
                        <span>{e.status === "rejected_koord" ? "reddedildi" : "onaylandı"}</span>
                        <span className="font-semibold">{formatCurrency(e.amount)}</span>
                        <StatusBadge status={e.status} />
                        <span className="text-gray-500 text-xs w-full md:w-auto">{formatDate(e.actionDate!)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "awaiting" && (
          <div className="space-y-3">
            {awaiting.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
                <p className="text-slate-600 font-medium">Henüz harcama yok</p>
                <p className="text-sm text-slate-400 mt-1">Bölge onayı bekleyen harcama bulunmuyor.</p>
              </div>
            ) : (
              awaiting.map((e) => (
                <Card key={e.id} className="rounded-2xl shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    {e.bolge_warning && e.bolge_note && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        {e.bolge_note}
                      </div>
                    )}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold">{e.submitter_name}</p>
                        <p className="text-sm text-slate-500">{e.expense_number} · {e.il ?? "—"} · {regionToTurkish(e.bolge)} · {e.expense_type}</p>
                        <p className="text-sm text-slate-600 mt-1">{formatCurrency(e.amount)} · {formatDate(e.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {e.status === "pending_koord" && (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Bölge talebi</span>
                        )}
                        <StatusBadge status={e.status} />
                      </div>
                    </div>
                    {e.description && <p className="text-xs text-slate-500">{e.description}</p>}
                    {e.receipt_url && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setReceiptLightbox({ url: e.receipt_url!, bolgeNote: e.bolge_note || null })}
                      >
                        <FileImage className="h-4 w-4 mr-2" /> Fişi Gör
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-[#16A34A] hover:bg-green-700" onClick={() => handleApprove(e)} disabled={actionLoading}>
                        <Check className="h-4 w-4 mr-2" /> Onayla
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectModal(e)} disabled={actionLoading}>
                        <X className="h-4 w-4 mr-2" /> Reddet
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "completed" && (
          <div className="space-y-3">
            {completed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
                <p className="text-slate-600 font-medium">Henüz kayıt yok</p>
                <p className="text-sm text-slate-400 mt-1">Onaylanan veya reddedilen harcama bulunmuyor.</p>
              </div>
            ) : (
              completed.map((e) => (
                <Card key={e.id} className="rounded-2xl shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{e.submitter_name}</p>
                        <p className="text-sm text-slate-500">{e.expense_number} · {formatCurrency(e.amount)}</p>
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                    {e.receipt_url && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setReceiptLightbox({ url: e.receipt_url!, bolgeNote: e.bolge_note || null })}
                      >
                        <FileImage className="h-4 w-4 mr-2" /> Fişi Gör
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "limits" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Bölge Limitleri</h2>
              <span className="text-sm text-slate-500">
                Bu ay · {new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date())}
              </span>
            </div>

            {limitsBanner.type === "red" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 text-sm font-medium">
                {limitsBanner.text}
              </div>
            )}
            {limitsBanner.type === "amber" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm font-medium">
                {limitsBanner.text}
              </div>
            )}
            {limitsBanner.type === "green" && (
              <div className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-800">
                {limitsBanner.text}
              </div>
            )}

            {REGION_LIMIT_SLUGS.map((slug) => {
              const limit = regionLimits[slug] ?? 0;
              const spent = thisMonthSpentByRegion[slug] ?? 0;
              const pct = limit > 0 ? (spent / limit) * 100 : 0;
              const overLimit = limit > 0 && spent >= limit;
              const borderColor =
                overLimit ? "border-l-red-500" : pct >= 90 ? "border-l-orange-500" : pct >= 70 ? "border-l-amber-500" : "border-l-green-500";
              const progressColor =
                overLimit ? "bg-red-500" : pct >= 90 ? "bg-orange-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500";
              const pctColor =
                overLimit ? "text-red-600" : pct >= 90 ? "text-orange-600" : pct >= 70 ? "text-amber-600" : "text-green-600";
              const isEditing = editingSlug === slug;
              return (
                <div
                  key={slug}
                  ref={isEditing ? (el) => { editCardRef.current = el; } : undefined}
                >
                <Card
                  className={`rounded-2xl shadow-sm border-l-4 ${borderColor} ${overLimit ? "bg-red-50" : ""}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-slate-800">{regionToTurkish(slug)}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatCurrency(spent)} / {formatCurrency(limit)}
                        </p>
                      </div>
                      {limit > 0 && (
                        <span className={`text-2xl font-semibold ${pctColor}`}>
                          {pct.toFixed(0)}%
                        </span>
                      )}
                    </div>

                    {limit > 0 && (
                      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${progressColor} transition-all duration-500`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] text-slate-500">
                        {formatCurrency(spent)} harcandı
                      </p>
                      <div className="flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-24 text-sm"
                              value={editLimitValue}
                              onChange={(e) => setEditLimitValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = Number(editLimitValue);
                                  if (!Number.isNaN(v) && v >= 0) handleSaveLimit(slug, v);
                                }
                                if (e.key === "Escape") setEditingSlug(null);
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const v = Number(editLimitValue);
                                if (!Number.isNaN(v) && v >= 0) handleSaveLimit(slug, v);
                              }}
                              disabled={limitUpdating === slug}
                              className="p-1 rounded text-green-600 hover:bg-green-100"
                              aria-label="Kaydet"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSlug(null)}
                              className="p-1 rounded text-slate-500 hover:bg-slate-100"
                              aria-label="İptal"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[13px] text-slate-600">/ {formatCurrency(limit)}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSlug(slug);
                                setEditLimitValue(String(limit || ""));
                              }}
                              className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                              aria-label="Limit düzenle"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav
        tabs={[
          { id: "dashboard", label: "Dashboard", icon: BarChart2 },
          { id: "awaiting", label: "Onay Bekleyen", icon: Clock, badge: awaiting.length },
          { id: "completed", label: "Tamamlananlar", icon: CheckCircle },
          { id: "limits", label: "Limitler", icon: Wallet },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as "dashboard" | "awaiting" | "completed" | "limits")}
      />

      <ApprovalModal
        open={!!rejectModal}
        onOpenChange={(o) => !o && setRejectModal(null)}
        title="Reddet"
        description={`${rejectModal?.expense_number ?? ""} numaralı harcamayı reddetmek istediğinize emin misiniz?`}
        confirmLabel="Reddet"
        variant="destructive"
        onConfirm={() => { if (rejectModal) void handleReject(rejectModal); }}
        loading={actionLoading}
      />

      <ReceiptLightbox
        open={!!receiptLightbox}
        onClose={() => setReceiptLightbox(null)}
        receiptUrl={receiptLightbox?.url ?? ""}
        bolgeNote={receiptLightbox?.bolgeNote ?? null}
      />
    </div>
  );
}
