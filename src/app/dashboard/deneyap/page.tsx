import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardDataDeneyap } from "@/lib/dashboard-data";
import { DeneyapClient } from "./DeneyapClient";

export default async function DeneyapPage() {
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
  if (role !== "deneyap") redirect("/dashboard");

  const initialData = await getDashboardDataDeneyap(user.id);
  return <DeneyapClient initialData={initialData} />;
}
