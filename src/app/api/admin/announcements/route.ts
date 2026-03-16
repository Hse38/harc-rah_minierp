import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../ensure-admin";

export async function GET() {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .select("id, title, content, created_by, target_roles, target_bolge, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const [supabase] = out;
  const admin = createAdminClient();
  const body = await request.json();
  const { title, content, target_roles, target_bolge } = body as {
    title: string;
    content: string;
    target_roles: string[];
    target_bolge?: string | null;
  };
  if (!title?.trim()) {
    return NextResponse.json({ error: "Başlık zorunludur" }, { status: 400 });
  }
  const { data: { user } } = await supabase!.auth.getUser();
  const { data: row, error } = await admin
    .from("announcements")
    .insert({
      title: title.trim(),
      content: content?.trim() ?? "",
      created_by: user?.id ?? null,
      target_roles: Array.isArray(target_roles) ? target_roles : ["all"],
      target_bolge: target_bolge || null,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("system_logs").insert({
    user_id: user?.id ?? null,
    user_name: (user?.user_metadata?.full_name as string) ?? "Admin",
    action: "announcement_created",
    target_type: "announcement",
    target_id: row.id,
    details: { title: title.trim() },
  });
  return NextResponse.json({ success: true, id: row.id });
}
