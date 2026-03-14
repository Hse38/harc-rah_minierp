import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Role, ExpenseStatus } from "@/types";

const EXPENSE_FIELDS_DENEYAP =
  "id,expense_number,submitter_id,submitter_name,amount,status,created_at,expense_type";

export type DashboardDeneyapResponse = {
  totalSpending: number;
  monthlySpending: number;
  paidAmount: number;
  averageSpending: number;
  approvalStats: { pending: number; approved: number; paid: number; rejected: number };
  chartData: { ay: string; toplam: number }[];
  recentExpenses: { id: string; expense_number: string; amount: number; status: ExpenseStatus; created_at: string; expense_type: string }[];
};

type ExpenseRow = { id: string; expense_number: string; amount: number; status: ExpenseStatus; created_at: string; expense_type: string };

function computeDeneyapPayload(rows: ExpenseRow[]): DashboardDeneyapResponse {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalSpending = rows.reduce((s, e) => s + Number(e.amount), 0);
  const monthlySpending = rows
    .filter((e) => new Date(e.created_at) >= thisMonthStart)
    .reduce((s, e) => s + Number(e.amount), 0);
  const paidRows = rows.filter((e) => e.status === "paid");
  const paidAmount = paidRows.reduce((s, e) => s + Number(e.amount), 0);
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
    status: e.status,
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

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = (searchParams.get("role") as Role) ?? "deneyap";

    if (role === "deneyap") {
      const { data, error } = await supabase
        .from("expenses")
        .select(EXPENSE_FIELDS_DENEYAP)
        .eq("submitter_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as ExpenseRow[];
      const payload = computeDeneyapPayload(rows);
      return NextResponse.json(payload);
    }

    if (role === "koordinator") {
      const EXPENSE_FIELDS_KOORD =
        "id,expense_number,submitter_id,submitter_name,iban,il,bolge,expense_type,amount,description,receipt_url,ai_analysis,status,bolge_note,bolge_warning,reviewed_by_bolge,reviewed_by_koord,reviewed_at_bolge,reviewed_at_koord,created_at";
      const [expensesRes, limitsRes] = await Promise.all([
        supabase
          .from("expenses")
          .select(EXPENSE_FIELDS_KOORD)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("region_limits").select("bolge, monthly_limit"),
      ]);
      if (expensesRes.error) throw expensesRes.error;
      if (limitsRes.error) throw limitsRes.error;
      const regionLimits: Record<string, number> = {};
      (limitsRes.data ?? []).forEach((r: { bolge: string; monthly_limit: number }) => {
        regionLimits[r.bolge] = Number(r.monthly_limit);
      });
      return NextResponse.json({
        expenses: expensesRes.data ?? [],
        regionLimits,
      });
    }

    return NextResponse.json({ error: "Unsupported role for dashboard API" }, { status: 400 });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Dashboard data failed" },
      { status: 500 }
    );
  }
}
