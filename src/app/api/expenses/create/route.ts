import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNextExpenseNumber } from "@/lib/expense-number";

type CreateExpenseBody = {
  iban?: string;
  expense_type?: string;
  amount?: number;
  description?: string;
  receipt_url?: string;
  ai_analysis?: string | null;
  manuel_giris?: boolean;
  fis_hash?: string | null;
  eski_fis?: boolean;
  il?: string;
  kategori_detay?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateExpenseBody;

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Geçersiz tutar" }, { status: 400 });
  }
  if (!body.receipt_url) {
    return NextResponse.json({ error: "Fiş yüklemek zorunludur" }, { status: 400 });
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, iban, il, bolge, role")
    .eq("id", user.id)
    .single();
  if (pErr || !profile) {
    return NextResponse.json({ error: "Profil bulunamadı" }, { status: 400 });
  }

  const fis_hash = body.fis_hash ? String(body.fis_hash).trim() : null;
  if (fis_hash) {
    const { data: dup } = await supabase
      .from("expenses")
      .select("expense_number,status")
      .eq("fis_hash", fis_hash)
      .not("status", "in", "(deleted,rejected_bolge,rejected_koord)")
      .limit(1)
      .maybeSingle();

    if (dup && (dup as { expense_number?: string } | null)?.expense_number) {
      const num = (dup as { expense_number: string }).expense_number;
      return NextResponse.json(
        {
          error:
            `Bu fiş daha önce kullanıldı. Aynı fiş tekrar yüklenemez. (İlgili harcama: ${num})`,
          duplicate_expense_number: num,
        },
        { status: 409 }
      );
    }
  }

  const expense_number = await getNextExpenseNumber(async () => {
    const { data: lastRow } = await supabase
      .from("expenses")
      .select("expense_number")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (lastRow as { expense_number: string } | null)?.expense_number ?? null;
  });

  const insertPayload = {
    expense_number,
    submitter_id: profile.id as string,
    submitter_name: (profile as { full_name?: string | null }).full_name ?? (user.user_metadata?.full_name as string) ?? "",
    iban: body.iban || (profile as { iban?: string | null }).iban || "",
    il: body.il || (profile as { il?: string | null }).il || "",
    bolge: (profile as { bolge?: string | null }).bolge || "",
    expense_type: body.expense_type || "Diğer",
    amount,
    description: body.description || "",
    receipt_url: body.receipt_url,
    ai_analysis: body.ai_analysis ?? null,
    status:
      (profile as { role?: string | null }).role === "bolge"
        ? ("pending_koord" as const)
        : ("pending_bolge" as const),
    manuel_giris: !!body.manuel_giris,
    eski_fis: !!body.eski_fis,
    fis_hash,
    kategori_detay: body.kategori_detay ?? null,
  };

  const { error: insErr } = await supabase.from("expenses").insert(insertPayload);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  const { data: inserted } = await supabase
    .from("expenses")
    .select("id, expense_number")
    .eq("expense_number", expense_number)
    .single();

  return NextResponse.json({ ok: true, ...inserted });
}

