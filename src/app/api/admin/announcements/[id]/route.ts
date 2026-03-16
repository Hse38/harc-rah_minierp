import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../../ensure-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const { id } = await params;
  const admin = createAdminClient();
  const body = await request.json();
  const { is_active } = body as { is_active?: boolean };
  const { error } = await admin
    .from("announcements")
    .update({ is_active: !!is_active })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
