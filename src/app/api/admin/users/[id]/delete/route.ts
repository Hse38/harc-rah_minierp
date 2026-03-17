import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../../../ensure-admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const [supabase] = out;
  const { id } = await params;
  const admin = createAdminClient();

  const { error: deleteError } = await admin.auth.admin.deleteUser(id);
  if (deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 400 });

  // Best-effort profile cleanup (in case FK cascade isn't enabled)
  await admin.from("profiles").delete().eq("id", id);

  const {
    data: { user },
  } = await supabase!.auth.getUser();
  await admin.from("system_logs").insert({
    user_id: user?.id ?? null,
    user_name: (user?.user_metadata?.full_name as string) ?? "Admin",
    action: "user_deleted",
    target_type: "user",
    target_id: id,
    details: {},
  });

  return NextResponse.json({ success: true });
}

