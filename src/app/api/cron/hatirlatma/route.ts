import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { sendNotificationToRole } from "@/lib/send-notification";

type ExpenseRow = {
  id: string;
  expense_number: string;
  amount: number;
  bolge: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  last_reminder_at?: string | null;
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data, error } = await admin
    .from("expenses")
    .select("id,expense_number,amount,bolge,status,created_at,updated_at,last_reminder_at,archived_at")
    .in("status", ["pending_bolge", "pending_koord"])
    .is("archived_at", null)
    .lte("created_at", threeDaysAgo.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as (ExpenseRow & { archived_at?: string | null })[];
  const due = rows.filter((e) => {
    const stamp = new Date((e.updated_at ?? e.created_at) as string);
    if (stamp > threeDaysAgo) return false;
    const last = e.last_reminder_at ? new Date(e.last_reminder_at) : null;
    if (last && last > dayAgo) return false;
    return true;
  });

  let reminded = 0;
  let escalated = 0;

  for (const e of due) {
    const isSeven = new Date(e.created_at) <= sevenDaysAgo;

    // recipient roles
    const toRole = e.status === "pending_bolge" ? "bolge" : "koordinator";
    const bolge = e.bolge ?? undefined;

    // base notification
    const msg = `⏰ [${e.expense_number}] ${e.status === "pending_bolge" ? "bölge" : "koordinatör"} onayı 3+ gündür bekliyor. (${formatCurrency(
      Number(e.amount)
    )})`;

    await sendNotificationToRole(toRole, {
      ...(toRole === "bolge" && bolge ? { bolge } : {}),
      expenseId: e.id,
      message: msg,
      pushTitle: "TAMGA - Hatırlatma",
      pushBody: msg,
      pushUrl: toRole === "bolge" ? "/dashboard/bolge" : "/dashboard/koordinator",
    });

    // mark expense
    await admin.from("expenses").update({ last_reminder_at: now.toISOString() }).eq("id", e.id);
    reminded += 1;

    if (isSeven) {
      const escMsg = `🚨 [${e.expense_number}] onay 7+ gündür bekliyor. Lütfen takip edin. (${formatCurrency(
        Number(e.amount)
      )})`;
      await Promise.all([
        sendNotificationToRole("yk", {
          expenseId: e.id,
          message: escMsg,
          pushTitle: "TAMGA - Escalation",
          pushBody: escMsg,
          pushUrl: "/dashboard/yk",
        }),
        sendNotificationToRole("admin", {
          expenseId: e.id,
          message: escMsg,
          pushTitle: "TAMGA - Escalation",
          pushBody: escMsg,
          pushUrl: "/dashboard/admin",
        }),
        ...(e.status === "pending_bolge"
          ? [
              sendNotificationToRole("koordinator", {
                expenseId: e.id,
                message: escMsg,
                pushTitle: "TAMGA - Escalation",
                pushBody: escMsg,
                pushUrl: "/dashboard/koordinator",
              }),
            ]
          : []),
      ]);
      escalated += 1;
    }
  }

  return NextResponse.json({ ok: true, candidates: rows.length, reminded, escalated });
}

