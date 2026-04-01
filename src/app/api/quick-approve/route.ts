import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? "";
  if (role !== "bolge" && role !== "koordinator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: expense } = await supabase
    .from("expenses")
    .select("id,status,expense_number")
    .eq("id", id)
    .maybeSingle();
  const status = (expense as { status?: string } | null)?.status ?? null;
  if (!status) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();

  if (role === "bolge") {
    if (status !== "pending_bolge") {
      return NextResponse.json({ error: "Not pending bolge" }, { status: 409 });
    }
    const { error } = await supabase
      .from("expenses")
      .update({ status: "approved_bolge", reviewed_by_bolge: user.id, reviewed_at_bolge: now })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // koordinator
  if (status !== "pending_koord") {
    return NextResponse.json({ error: "Not pending koordinator" }, { status: 409 });
  }
  const { error } = await supabase
    .from("expenses")
    .update({ status: "approved_koord", reviewed_by_koord: user.id, reviewed_at_koord: now })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

