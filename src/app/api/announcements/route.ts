import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET: returns announcements visible to the current user (by role + target_roles / target_bolge). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 200 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, bolge")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string; bolge?: string } | null)?.role ?? "";
  const bolge = (profile as { bolge?: string } | null)?.bolge ?? "";

  const { data: rows, error } = await supabase
    .from("announcements")
    .select("id, title, content, created_at, target_roles, target_bolge")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json([], { status: 200 });
  const list = (rows ?? []).filter((r: { target_roles?: string[]; target_bolge?: string | null }) => {
    const targetRoles = r.target_roles ?? [];
    const targetBolge = r.target_bolge;
    if (targetRoles.includes("all")) {
      if (!targetBolge) return true;
      return targetBolge === bolge;
    }
    if (!targetRoles.includes(role)) return false;
    if (targetBolge && targetBolge !== bolge) return false;
    return true;
  });
  const publicList = list.map((r: { id: string; title: string; content: string; created_at: string }) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    created_at: r.created_at,
  }));
  return NextResponse.json(publicList);
}
