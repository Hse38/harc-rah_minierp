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
      const [profilesRes, expensesRes] = await Promise.all([
        admin.from("profiles").select("id, full_name, il, role, bolge"),
        admin.from("expenses").select("il, amount, status, submitter_id"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (expensesRes.error) throw expensesRes.error;

      return {
        profiles: profilesRes.data ?? [],
        expenses: expensesRes.data ?? [],
      };
    },
    ["admin", "map-expenses"],
    { revalidate: 300 }
  );

  try {
    return NextResponse.json(await getCached());
  } catch (e) {
    return NextResponse.json({ error: (e as { message?: string } | null)?.message ?? "Veri yüklenemedi" }, { status: 500 });
  }
}

