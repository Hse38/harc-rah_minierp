import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../ensure-admin";

export async function GET(request: Request) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const userQ = searchParams.get("user") ?? "";
  const actionQ = searchParams.get("action") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  let query = admin
    .from("system_logs")
    .select("id, user_id, user_name, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (userQ.trim()) query = query.ilike("user_name", `%${userQ.trim()}%`);
  if (actionQ) query = query.eq("action", actionQ);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59.999Z");
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
