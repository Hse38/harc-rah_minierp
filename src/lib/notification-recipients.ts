import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * profiles tablosundan bildirim alacak kullanıcı id'lerini döner.
 * - role + bolge: bölge sorumluları (role='bolge' AND bolge=expenseBolge)
 * - role only: koordinatör, muhasebe, yk (role='koordinator' | 'muhasebe' | 'yk')
 */
export async function getRecipientIds(
  supabase: SupabaseClient,
  options: { role: string; bolge?: string }
): Promise<string[]> {
  let query = supabase.from("profiles").select("id").eq("role", options.role);
  if (options.bolge != null && options.bolge !== "") {
    query = query.eq("bolge", options.bolge);
  }
  const { data } = await query;
  return (data ?? []).map((r: { id: string }) => r.id);
}
