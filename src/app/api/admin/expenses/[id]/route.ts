import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../../ensure-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const [supabase] = out;
  const { id } = await params;
  const admin = createAdminClient();
  const body = await request.json();
  const { status, reason } = body as { status?: string; reason?: string };
  if (!status) return NextResponse.json({ error: "status zorunludur" }, { status: 400 });
  if (!reason?.trim()) return NextResponse.json({ error: "Değişiklik nedeni zorunludur" }, { status: 400 });

  const { data: expense, error: fetchErr } = await admin
    .from("expenses")
    .select("id, expense_number, amount, submitter_name, status")
    .eq("id", id)
    .single();
  if (fetchErr || !expense) return NextResponse.json({ error: "Harcama bulunamadı" }, { status: 404 });
  const exp = expense as { expense_number?: string; amount?: number; submitter_name?: string; status?: string };

  const { error: updateErr } = await admin
    .from("expenses")
    .update({ status })
    .eq("id", id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  const { data: { user } } = await supabase!.auth.getUser();
  await admin.from("system_logs").insert({
    user_id: user?.id ?? null,
    user_name: (user?.user_metadata?.full_name as string) ?? "Admin",
    action: "admin_override",
    target_type: "expense",
    target_id: id,
    details: {
      expense_number: exp.expense_number,
      amount: exp.amount,
      submitter_name: exp.submitter_name,
      previous_status: exp.status,
      new_status: status,
      reason: reason.trim(),
    },
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const out = await ensureAdmin();
  if (out[2]) return out[2];
  const [supabase] = out;
  const { id } = await params;
  const admin = createAdminClient();
  const { data: expense, error: fetchErr } = await admin
    .from("expenses")
    .select("id, expense_number, amount, submitter_name, status")
    .eq("id", id)
    .single();
  if (fetchErr || !expense) return NextResponse.json({ error: "Harcama bulunamadı" }, { status: 404 });

  const prevStatus = (expense as { status?: string | null }).status ?? null;
  const { error: updateErr } = await admin
    .from("expenses")
    .update({ status: "deleted" })
    .eq("id", id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  const { data: { user } } = await supabase!.auth.getUser();
  const now = new Date().toISOString();
  await admin
    .from("expenses")
    .update({
      archived_at: now,
      archived_by: user?.id ?? null,
      previous_status: prevStatus,
    })
    .eq("id", id);

  await admin.from("system_logs").insert({
    user_id: user?.id ?? null,
    user_name: (user?.user_metadata?.full_name as string) ?? "Admin",
    action: "expense_archived",
    target_type: "expense",
    target_id: id,
    details: {
      expense_number: (expense as { expense_number?: string }).expense_number,
      amount: (expense as { amount?: number }).amount,
      previous_status: prevStatus,
    },
  });
  return NextResponse.json({ success: true });
}
