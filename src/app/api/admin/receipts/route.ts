import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../ensure-admin";
import { unstable_cache } from "next/cache";

export async function GET() {
  const out = await ensureAdmin();
  if (out[2]) return out[2];

  const getCached = unstable_cache(
    async () => {
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

      if (error) throw error;
      return data ?? [];
    },
    ["admin", "receipts"],
    { revalidate: 600 }
  );

  try {
    return NextResponse.json(await getCached());
  } catch (e) {
    return NextResponse.json({ error: (e as { message?: string } | null)?.message ?? "Veri yüklenemedi" }, { status: 500 });
  }
}

