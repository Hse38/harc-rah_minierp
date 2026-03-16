import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../ensure-admin";

export async function GET() {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const admin = createAdminClient();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [profilesRes, expensesRes, announcementsRes, logsRes, logs24Res] = await Promise.all([
    admin.from("profiles").select("id, role"),
    admin.from("expenses").select("id, amount, status, created_at"),
    admin.from("announcements").select("id").eq("is_active", true),
    admin.from("system_logs").select("id, user_name, action, created_at").order("created_at", { ascending: false }).limit(10),
    admin.from("system_logs").select("id", { count: "exact", head: true }).gte("created_at", last24h.toISOString()),
  ]);

  const profiles = (profilesRes.data ?? []) as { id: string; role: string }[];
  const expenses = (expensesRes.data ?? []) as { amount: number; status: string; created_at: string }[];
  const roleCounts: Record<string, number> = {};
  profiles.forEach((p) => {
    roleCounts[p.role] = (roleCounts[p.role] ?? 0) + 1;
  });
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const pendingCount = expenses.filter((e) =>
    ["pending_bolge", "pending_koord"].includes(e.status)
  ).length;
  const thisMonthCount = expenses.filter((e) => new Date(e.created_at) >= thisMonthStart).length;
  const thisMonthAmount = expenses
    .filter((e) => new Date(e.created_at) >= thisMonthStart)
    .reduce((s, e) => s + Number(e.amount), 0);

  return NextResponse.json({
    totalUsers: profiles.length,
    roleCounts,
    totalExpense,
    pendingApproval: pendingCount,
    thisMonthExpenseCount: thisMonthCount,
    thisMonthExpenseAmount: thisMonthAmount,
    activeAnnouncements: (announcementsRes.data ?? []).length,
    logsLast24h: logs24Res.count ?? 0,
    recentLogs: logsRes.data ?? [],
  });
}
