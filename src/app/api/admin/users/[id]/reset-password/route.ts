import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../../../ensure-admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const [supabase] = out;
  const { id } = await params;
  const body = await request.json();
  const { new_password } = body as { new_password?: string };
  if (!new_password || new_password.length < 8) {
    return NextResponse.json(
      { error: "Yeni şifre en az 8 karakter olmalıdır" },
      { status: 400 }
    );
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password: new_password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: { user } } = await supabase!.auth.getUser();
  await admin.from("system_logs").insert({
    user_id: user?.id ?? null,
    user_name: (user?.user_metadata?.full_name as string) ?? "Admin",
    action: "password_reset",
    target_type: "user",
    target_id: id,
    details: {},
  });
  return NextResponse.json({ success: true });
}
