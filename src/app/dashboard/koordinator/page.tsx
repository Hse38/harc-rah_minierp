import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardDataKoordinator } from "@/lib/dashboard-data";
import { KoordinatorClient } from "./KoordinatorClient";

export default async function KoordinatorPage() {
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

  const initialData = await getDashboardDataKoordinator();
  return <KoordinatorClient initialData={initialData} />;
}
