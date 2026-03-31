import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../ensure-admin";

export async function GET() {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("expenses")
    .select(
      "id,expense_number,submitter_id,submitter_name,receipt_url,created_at,amount,manuel_giris,eski_fis,fis_hash"
    )
    .not("receipt_url", "is", null)
    .order("submitter_name", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

