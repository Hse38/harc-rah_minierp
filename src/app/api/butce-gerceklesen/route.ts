import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Row = { bolge: string; limit: number; gerceklesen: number; yuzde: number };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile as { role?: string | null } | null)?.role ?? null;
  if (!role || !["koordinator", "yk", "admin"].includes(String(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [limitsRes, expensesRes] = await Promise.all([
    admin.from("region_limits").select("bolge, monthly_limit"),
    admin
      .from("expenses")
      .select("bolge, amount, status, created_at")
      .gte("created_at", monthStart.toISOString())
      .in("status", ["approved_koord", "paid"])
      .is("archived_at", null),
  ]);

  if (limitsRes.error) return NextResponse.json({ error: limitsRes.error.message }, { status: 500 });
  if (expensesRes.error) return NextResponse.json({ error: expensesRes.error.message }, { status: 500 });

  const limitMap: Record<string, number> = {};
  (limitsRes.data ?? []).forEach((r: { bolge: string; monthly_limit: number }) => {
    if (!r?.bolge) return;
    limitMap[r.bolge] = Number(r.monthly_limit ?? 0);
  });

  const actualMap: Record<string, number> = {};
  (expensesRes.data ?? []).forEach((e: { bolge: string; amount: number }) => {
    if (!e?.bolge) return;
    actualMap[e.bolge] = (actualMap[e.bolge] ?? 0) + Number(e.amount ?? 0);
  });

  const keys = Array.from(new Set([...Object.keys(limitMap), ...Object.keys(actualMap)])).sort();
  const out: Row[] = keys.map((bolge) => {
    const limit = Number(limitMap[bolge] ?? 0);
    const gerceklesen = Number(actualMap[bolge] ?? 0);
    const yuzde = limit > 0 ? Math.round((gerceklesen / limit) * 100) : 0;
    return { bolge, limit, gerceklesen, yuzde };
  });

  return NextResponse.json(out);
}

