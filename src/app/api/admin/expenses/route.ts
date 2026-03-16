import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../ensure-admin";
import { EXPENSE_FIELDS_FULL } from "@/lib/expense-fields";

export async function GET(request: Request) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";
  const bolge = searchParams.get("bolge") ?? "";
  const il = searchParams.get("il") ?? "";
  const q = searchParams.get("q") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const amountMin = searchParams.get("amountMin") ?? "";
  const amountMax = searchParams.get("amountMax") ?? "";
  const sort = searchParams.get("sort") ?? "created_at";
  const ascending = searchParams.get("order") === "asc";

  let query = admin.from("expenses").select(EXPENSE_FIELDS_FULL);
  if (status) query = query.eq("status", status);
  if (bolge) query = query.eq("bolge", bolge);
  if (il) query = query.eq("il", il);
  if (q.trim()) query = query.ilike("submitter_name", `%${q.trim()}%`);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59.999Z");
  if (amountMin !== "") query = query.gte("amount", Number(amountMin) || 0);
  if (amountMax !== "") query = query.lte("amount", Number(amountMax) || 999999);
  const { data, error } = await query.order(sort, { ascending }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
