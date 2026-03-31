import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../ensure-admin";

export async function GET() {
  const out = await ensureAdmin();
  if (out[2]) return out[2];

  const admin = createAdminClient();
  const [profilesRes, expensesRes] = await Promise.all([
    admin.from("profiles").select("id, full_name, il, role, bolge"),
    admin.from("expenses").select("il, amount, status, submitter_id"),
  ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }
  if (expensesRes.error) {
    return NextResponse.json({ error: expensesRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    profiles: profilesRes.data ?? [],
    expenses: expensesRes.data ?? [],
  });
}

