import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const userName = (profile as { full_name?: string } | null)?.full_name ?? user.email ?? "Kullanıcı";
  const body = await request.json();
  const { action, target_type, target_id, details } = body as {
    action: string;
    target_type: string;
    target_id: string;
    details?: Record<string, unknown>;
  };
  if (!action || !target_type || !target_id) {
    return NextResponse.json({ error: "action, target_type, target_id zorunludur" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("system_logs").insert({
    user_id: user.id,
    user_name: userName,
    action,
    target_type,
    target_id,
    details: details ?? {},
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
