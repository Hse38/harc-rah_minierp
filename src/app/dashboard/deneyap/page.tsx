import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardDataDeneyap } from "@/lib/dashboard-data";
import { DeneyapClient } from "./DeneyapClient";

function isNextRedirect(e: unknown): boolean {
  return !!(
    e &&
    typeof e === "object" &&
    "digest" in e &&
    String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export default async function DeneyapPage() {
  let userId: string;
  let initialData: Awaited<ReturnType<typeof getDashboardDataDeneyap>> = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userId = user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile as { role?: string } | null)?.role ?? "deneyap";
    if (role !== "deneyap") redirect("/dashboard");

    initialData = await getDashboardDataDeneyap(userId);
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    console.error("[DeneyapPage]", e);
    initialData = null;
  }

  return <DeneyapClient initialData={initialData} />;
}
