import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DashboardDeneyapResponse } from "@/app/api/dashboard/route";
import type { Expense, ExpenseStatus } from "@/types";

export type DashboardKoordinatorResponse = {
  expenses: Expense[];
  regionLimits: Record<string, number>;
};

const EXPENSE_FIELDS_KOORD =
  "id,expense_number,submitter_id,submitter_name,iban,il,bolge,expense_type,amount,description,receipt_url,ai_analysis,status,bolge_note,bolge_warning,reviewed_by_bolge,reviewed_by_koord,reviewed_at_bolge,reviewed_at_koord,created_at";

const EXPENSE_FIELDS_DENEYAP =
  "id,expense_number,submitter_id,submitter_name,amount,status,created_at,expense_type";

async function getDeneyapPayloadUncached(userId: string): Promise<DashboardDeneyapResponse | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(EXPENSE_FIELDS_DENEYAP)
    .eq("submitter_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return null;
  const rows = (data ?? []) as { id: string; expense_number: string; amount: number; status: string; created_at: string; expense_type: string }[];
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalSpending = rows.reduce((s, e) => s + Number(e.amount), 0);
  const monthlySpending = rows
    .filter((e) => new Date(e.created_at) >= thisMonthStart)
    .reduce((s, e) => s + Number(e.amount), 0);
  const paidAmount = rows.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
  const averageSpending = rows.length ? totalSpending / rows.length : 0;
  const pending = rows.filter((e) => e.status === "pending_bolge").length;
  const approved = rows.filter((e) =>
    ["approved_bolge", "approved_koord", "paid"].includes(e.status)
  ).length;
  const paid = rows.filter((e) => e.status === "paid").length;
  const rejected = rows.filter((e) =>
    ["rejected_bolge", "rejected_koord"].includes(e.status)
  ).length;
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
  const recentExpenses = rows.slice(0, 5).map((e) => ({
    id: e.id,
    expense_number: e.expense_number,
    amount: e.amount,
    status: e.status as ExpenseStatus,
    created_at: e.created_at,
    expense_type: e.expense_type ?? "Diğer",
  }));
  return {
    totalSpending,
    monthlySpending,
    paidAmount,
    averageSpending,
    approvalStats: { pending, approved, paid, rejected },
    chartData,
    recentExpenses,
  };
}

export async function getDashboardDataDeneyap(userId: string): Promise<DashboardDeneyapResponse | null> {
  return unstable_cache(
    () => getDeneyapPayloadUncached(userId),
    ["dashboard", "deneyap", userId],
    { revalidate: 60 }
  )();
}

async function getKoordinatorPayloadUncached(): Promise<DashboardKoordinatorResponse> {
  const supabase = createAdminClient();
  const [expensesRes, limitsRes] = await Promise.all([
    supabase
      .from("expenses")
      .select(EXPENSE_FIELDS_KOORD)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("region_limits").select("bolge, monthly_limit"),
  ]);
  if (expensesRes.error) return { expenses: [], regionLimits: {} };
  if (limitsRes.error) {
    console.error("[getKoordinatorPayloadUncached] region_limits error:", limitsRes.error.message, limitsRes.error.code);
    return { expenses: (expensesRes.data ?? []) as Expense[], regionLimits: {} };
  }
  const regionLimits: Record<string, number> = {};
  (limitsRes.data ?? []).forEach((r: { bolge: string; monthly_limit: number }) => {
    regionLimits[r.bolge] = Number(r.monthly_limit);
  });
  return {
    expenses: (expensesRes.data ?? []) as Expense[],
    regionLimits,
  };
}

export async function getDashboardDataKoordinator(): Promise<DashboardKoordinatorResponse> {
  return unstable_cache(
    () => getKoordinatorPayloadUncached(),
    ["dashboard", "koordinator"],
    { revalidate: 60 }
  )();
}
