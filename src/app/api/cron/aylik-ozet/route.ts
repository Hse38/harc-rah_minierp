import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bolgeAdi, formatCurrency } from "@/lib/utils";

type ProfileRow = { id: string; bolge: string | null; full_name: string | null };
type ExpenseRow = {
  expense_number: string;
  amount: number;
  status: string;
  expense_type: string | null;
  created_at: string;
};

function monthKeyTR(d: Date) {
  const months = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getPrevMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { start, end } = getPrevMonthRange();
  const label = monthKeyTR(start);

  const { data: koords, error: koordErr } = await admin
    .from("profiles")
    .select("id, bolge, full_name")
    .eq("role", "koordinator");

  if (koordErr) return NextResponse.json({ error: koordErr.message }, { status: 500 });

  const list = (koords ?? []) as ProfileRow[];

  let sent = 0;
  for (const k of list) {
    if (!k.bolge) continue;

    const { data: expenses, error: expErr } = await admin
      .from("expenses")
      .select("expense_number,amount,status,expense_type,created_at")
      .eq("bolge", k.bolge)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .is("archived_at", null);

    if (expErr) continue;

    const rows = (expenses ?? []) as ExpenseRow[];
    const approved = rows.filter((e) => ["approved_koord", "paid"].includes(e.status));
    const rejected = rows.filter((e) => ["rejected_bolge", "rejected_koord"].includes(e.status));
    const pending = rows.filter((e) => ["pending_bolge", "pending_koord"].includes(e.status));
    const totalPaid = rows.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
    const totalApproved = approved.reduce((s, e) => s + Number(e.amount), 0);

    const highest = rows
      .slice()
      .sort((a, b) => Number(b.amount) - Number(a.amount))[0];

    const byType: Record<string, number> = {};
    for (const e of rows) {
      const t = e.expense_type || "Diğer";
      byType[t] = (byType[t] ?? 0) + Number(e.amount);
    }
    const typeLines = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t, v]) => `- ${t}: ${formatCurrency(v)}`)
      .join("\n");

    const bolgeLabel = bolgeAdi(k.bolge) || k.bolge;
    const msg =
      `📊 ${bolgeLabel} - ${label} Harcama Özeti\n` +
      `✅ Onaylanan: ${approved.length} harcama - ${formatCurrency(totalApproved)}\n` +
      `❌ Reddedilen: ${rejected.length} harcama\n` +
      `⏳ Bekleyen: ${pending.length} harcama\n` +
      `💰 Toplam Ödenen: ${formatCurrency(totalPaid)}\n` +
      (highest
        ? `📈 En yüksek harcama: ${highest.expense_number} - ${formatCurrency(Number(highest.amount))} (${highest.expense_type || "Diğer"})\n`
        : `📈 En yüksek harcama: —\n`) +
      `\nKategori dağılımı:\n${typeLines || "- —"}`;

    await admin.from("notifications").insert({
      recipient_id: k.id,
      recipient_role: "koordinator",
      expense_id: null,
      message: msg,
      is_read: false,
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, month: label });
}

