import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../ensure-admin";

export async function GET(request: Request) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") ?? "";
  const bolge = searchParams.get("bolge") ?? "";
  const q = searchParams.get("q") ?? "";

  let query = admin
    .from("profiles")
    .select("id, full_name, role, il, bolge, phone, created_at, izin_modu, izin_vekil_id, izin_baslangic, izin_bitis");
  if (role) query = query.eq("role", role);
  if (bolge) query = query.eq("bolge", bolge);
  const { data: profilesData, error } = await query.order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let list = (profilesData ?? []) as { id: string; full_name: string; role: string; il: string | null; bolge: string | null; phone: string | null; created_at: string }[];
  if (q.trim()) {
    const lower = q.trim().toLowerCase();
    list = list.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(lower)
    );
  }

  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = (authData?.users ?? []) as { id: string; email?: string; last_sign_in_at?: string }[];
  const authMap = new Map(authUsers.map((u) => [u.id, { email: u.email ?? "", last_sign_in_at: u.last_sign_in_at ?? null }]));

  const merged = list.map((p) => {
    const auth = authMap.get(p.id);
    return {
      ...p,
      email: auth?.email ?? "",
      last_sign_in_at: auth?.last_sign_in_at ?? null,
    };
  });
  return NextResponse.json(merged);
}
