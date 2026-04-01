import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../../../ensure-admin";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const [supabase] = out;
  const { id } = await params;
  const admin = createAdminClient();

  const { data: expense, error: fetchErr } = await admin
    .from("expenses")
    .select("id, expense_number, amount, submitter_name, status, previous_status, archived_at")
    .eq("id", id)
    .single();
  if (fetchErr || !expense) return NextResponse.json({ error: "Harcama bulunamadı" }, { status: 404 });

  const prev = (expense as { previous_status?: string | null }).previous_status ?? null;
  const restoreStatus = prev || "pending_bolge";

  const { error: updErr } = await admin
    .from("expenses")
    .update({
      status: restoreStatus,
      archived_at: null,
      archived_by: null,
      previous_status: null,
    })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  const {
    data: { user },
  } = await supabase!.auth.getUser();
  await admin.from("system_logs").insert({
    user_id: user?.id ?? null,
    user_name: (user?.user_metadata?.full_name as string) ?? "Admin",
    action: "expense_restore",
    target_type: "expense",
    target_id: id,
    details: {
      expense_number: (expense as { expense_number?: string }).expense_number,
      amount: (expense as { amount?: number }).amount,
      restored_to: restoreStatus,
    },
  });

  return NextResponse.json({ success: true });
}

