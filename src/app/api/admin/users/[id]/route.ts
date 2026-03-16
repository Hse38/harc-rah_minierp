import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../../ensure-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const { id } = await params;
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, role, il, bolge, iban, phone")
    .eq("id", id)
    .single();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });
  }
  const { data: authUser } = await admin.auth.admin.getUserById(id);
  const email = (authUser?.user?.email as string) ?? "";
  return NextResponse.json({ ...profile, email });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const [supabase] = out;
  const { id } = await params;
  const admin = createAdminClient();
  const body = await request.json();
  const { full_name, role, il, bolge, iban, phone } = body as {
    full_name?: string;
    role?: string;
    il?: string | null;
    bolge?: string | null;
    iban?: string | null;
    phone?: string | null;
  };
  const { error } = await admin
    .from("profiles")
    .update({
      ...(full_name != null && { full_name }),
      ...(role != null && { role }),
      ...(il !== undefined && { il: il || null }),
      ...(bolge !== undefined && { bolge: bolge || null }),
      ...(iban !== undefined && { iban: iban || null }),
      ...(phone !== undefined && { phone: phone || null }),
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: { user } } = await supabase!.auth.getUser();
  await admin.from("system_logs").insert({
    user_id: user?.id ?? null,
    user_name: (user?.user_metadata?.full_name as string) ?? "Admin",
    action: "user_updated",
    target_type: "user",
    target_id: id,
    details: body,
  });
  return NextResponse.json({ success: true });
}
