import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense } from "@/types";
import { regionToSlug, regionToTurkish } from "./region-names";

export type CheckLimitResult = { notified: boolean; pct?: number; message?: string };

/** Koordinatör onayı sonrası bölge limit kontrolü. Eşiklerde koordinator + YK için bildirim ekler. */
export async function checkLimitAfterApprove(
  supabase: SupabaseClient,
  expense: Expense
): Promise<CheckLimitResult> {
  const slug = regionToSlug(expense.bolge);
  if (!slug) return { notified: false };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: limits } = await supabase
    .from("region_limits")
    .select("monthly_limit")
    .eq("bolge", slug)
    .single();

  const limitAmount = limits?.monthly_limit != null ? Number(limits.monthly_limit) : null;
  if (limitAmount == null || limitAmount <= 0) return { notified: false };

  const { data: monthExpenses } = await supabase
    .from("expenses")
    .select("bolge, amount, status")
    .in("status", ["approved_koord", "paid"])
    .gte("created_at", monthStart)
    .lte("created_at", monthEnd);

  const list = (monthExpenses ?? []) as { bolge: string; amount: number; status: string }[];
  const sameRegionSum = list
    .filter((e) => regionToSlug(e.bolge) === slug)
    .reduce((s, e) => s + Number(e.amount), 0);

  const pct = (sameRegionSum / limitAmount) * 100;
  const bolgeTr = regionToTurkish(expense.bolge);

  let message: string | null = null;
  if (pct >= 100) {
    message = `🚨 ${bolgeTr} bölgesi aylık limiti AŞILDI!`;
  } else if (pct >= 90) {
    message = `🔴 ${bolgeTr} bölgesi limite %90 ulaştı`;
  } else if (pct >= 70) {
    message = `🟡 ${bolgeTr} bölgesi limitin %70'ini geçti`;
  }

  if (!message) return { notified: false, pct };

  await supabase.from("notifications").insert([
    { recipient_role: "koordinator", message },
    { recipient_role: "yk", message },
  ]);

  return { notified: true, pct, message };
}
