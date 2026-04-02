import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNextExpenseNumber } from "@/lib/expense-number";
import { createAdminClient } from "@/lib/supabase/admin";

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

function normalizeFisHash(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined") return null;
  // sha256 hex digest => 64 hex chars
  if (!/^[a-f0-9]{64}$/i.test(s)) return null;
  return lower;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateExpenseBody;

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[expenses/create] body.receipt_url:", body?.receipt_url);
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Geçersiz tutar" }, { status: 400 });
    }
    if (!body.receipt_url) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("[expenses/create] missing receipt_url");
      }
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

  const fis_hash = normalizeFisHash(body.fis_hash);
  // Skip duplicate detection if hash is missing/invalid.
  if (fis_hash) {
    // IMPORTANT: global duplicate detection must bypass RLS
    const { data: dup, error: dupErr } = await supabaseAdmin
      .from("expenses")
      .select("expense_number,status")
      .eq("fis_hash", fis_hash)
      .not("status", "in", '("deleted","rejected_bolge","rejected_koord")')
      .limit(1)
      .maybeSingle();

    // If the duplicate-check query itself errors, do NOT block with 409.
    // Let the insert proceed; any real conflict will surface as an insert error.
    if (dupErr && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[expenses/create] dup check error:", dupErr);
    }

    if (dup && (dup as { expense_number?: string } | null)?.expense_number) {
      console.log("DUP FOUND:", JSON.stringify(dup));
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
    // IMPORTANT: expense_number generation must bypass RLS, otherwise users may always get HRC-1001
    const { data: lastRow } = await supabaseAdmin
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

  const { error: insErr } = await supabaseAdmin.from("expenses").insert(insertPayload);
  if (insErr) {
    // eslint-disable-next-line no-console
    console.error("[expenses/create] Insert error:", JSON.stringify(insErr));
    // eslint-disable-next-line no-console
    console.error("[expenses/create] Insert payload keys:", Object.keys(insertPayload));
    // Preserve useful fields for debugging + client-side mapping
    return NextResponse.json(
      {
        error: insErr.message,
        code: (insErr as { code?: string }).code,
        details: (insErr as { details?: string }).details,
      },
      { status: 400 }
    );
  }

  const { data: inserted } = await supabaseAdmin
    .from("expenses")
    .select("id, expense_number")
    .eq("expense_number", expense_number)
    .single();

  return NextResponse.json({ ok: true, ...inserted });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[expenses/create] 500:", e);
    return NextResponse.json({ error: "Create expense failed" }, { status: 500 });
  }
}

