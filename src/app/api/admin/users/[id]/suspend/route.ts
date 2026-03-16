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
  const { suspend } = body as { suspend?: boolean };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: suspend ? "876000h" : "none",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: { user } } = await supabase!.auth.getUser();
  await admin.from("system_logs").insert({
    user_id: user?.id ?? null,
    user_name: (user?.user_metadata?.full_name as string) ?? "Admin",
    action: suspend ? "user_suspended" : "user_unsuspended",
    target_type: "user",
    target_id: id,
    details: { suspend },
  });
  return NextResponse.json({ success: true });
}
