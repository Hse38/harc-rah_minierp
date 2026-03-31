import { NextResponse } from "next/server";
import { ensureAdmin } from "../../../ensure-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOLGE_ILLER } from "@/lib/bolge-iller";

type VekaletRow = {
  id: string;
  vekil_user_id: string;
  asil_il: string;
  bolge: string;
  created_at: string;
  created_by: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("vekalet_atamalari")
    .select("id, vekil_user_id, asil_il, bolge, created_at, created_by")
    .eq("vekil_user_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json((data ?? []) as VekaletRow[]);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const [supabase] = out;
  const { id } = await params;

  const body = (await request.json()) as { asil_il?: string };
  const asil_il = String(body?.asil_il ?? "").trim();
  if (!asil_il) {
    return NextResponse.json({ error: "asil_il zorunludur" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: targetProfile, error: profileErr } = await admin
    .from("profiles")
    .select("id, role, il, bolge")
    .eq("id", id)
    .single();

  if (profileErr || !targetProfile) {
    return NextResponse.json({ error: "Kullanıcı profili bulunamadı" }, { status: 404 });
  }
  const role = (targetProfile as { role?: string }).role ?? "";
  const userIl = (targetProfile as { il?: string | null }).il ?? null;
  const bolge = (targetProfile as { bolge?: string | null }).bolge ?? null;

  if (role !== "il" && role !== "deneyap") {
    return NextResponse.json({ error: "Vekalet sadece il/deneyap kullanıcılarına atanır" }, { status: 400 });
  }
  if (!bolge) {
    return NextResponse.json({ error: "Kullanıcının bölge bilgisi yok" }, { status: 400 });
  }
  if (userIl && userIl.trim().toLocaleLowerCase("tr-TR") === asil_il.toLocaleLowerCase("tr-TR")) {
    return NextResponse.json({ error: "Kendi ili için vekalet atanamaz" }, { status: 400 });
  }

  const iller = (BOLGE_ILLER as Record<string, string[]>)[bolge] ?? [];
  if (!iller.some((x) => x.toLocaleLowerCase("tr-TR") === asil_il.toLocaleLowerCase("tr-TR"))) {
    return NextResponse.json({ error: "Seçilen il kullanıcının bölgesi içinde değil" }, { status: 400 });
  }

  const {
    data: { user: adminUser },
  } = await supabase!.auth.getUser();

  const { data: inserted, error: insErr } = await admin
    .from("vekalet_atamalari")
    .insert({
      vekil_user_id: id,
      asil_il,
      bolge,
      created_by: adminUser?.id ?? null,
    })
    .select("id, vekil_user_id, asil_il, bolge, created_at, created_by")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
  return NextResponse.json(inserted as VekaletRow);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const vekalet_id = String(searchParams.get("vekalet_id") ?? "").trim();
  if (!vekalet_id) {
    return NextResponse.json({ error: "vekalet_id zorunludur" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("vekalet_atamalari")
    .delete()
    .eq("id", vekalet_id)
    .eq("vekil_user_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

