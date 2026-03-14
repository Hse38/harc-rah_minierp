import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLE_DEFAULT: Record<string, string> = {
  deneyap: "/dashboard/deneyap",
  il: "/dashboard/il",
  bolge: "/dashboard/bolge",
  koordinator: "/dashboard/koordinator",
  muhasebe: "/dashboard/muhasebe",
  yk: "/dashboard/yk",
};

export default async function DashboardPage() {
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
  redirect(ROLE_DEFAULT[role] ?? "/dashboard/deneyap");
}
