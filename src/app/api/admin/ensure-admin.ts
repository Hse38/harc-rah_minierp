import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Returns [supabaseUserClient, profileRole] if admin; otherwise returns [null, null] and you should return the NextResponse from this. */
export async function ensureAdmin(
  request?: Request
): Promise<
  | [Awaited<ReturnType<typeof createClient>>, string]
  | [null, null, NextResponse]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [null, null, NextResponse.json({ error: "Unauthorized" }, { status: 401 })];
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin") {
    return [null, null, NextResponse.json({ error: "Forbidden" }, { status: 403 })];
  }
  return [supabase, role];
}
