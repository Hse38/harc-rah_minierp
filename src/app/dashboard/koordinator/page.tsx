import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardDataKoordinator } from "@/lib/dashboard-data";
import type { DashboardKoordinatorResponse } from "@/lib/dashboard-data";
import { KoordinatorClient } from "./KoordinatorClient";

function isNextRedirect(e: unknown): boolean {
  return !!(
    e &&
    typeof e === "object" &&
    "digest" in e &&
    String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

const FALLBACK_DATA: DashboardKoordinatorResponse = { expenses: [], regionLimits: {} };

export default async function KoordinatorPage() {
  let initialData: DashboardKoordinatorResponse = FALLBACK_DATA;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile as { role?: string } | null)?.role ?? "deneyap";
    if (role !== "koordinator") redirect("/dashboard");

    initialData = await getDashboardDataKoordinator();
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    console.error("[KoordinatorPage]", e);
  }

  return <KoordinatorClient initialData={initialData} />;
}
