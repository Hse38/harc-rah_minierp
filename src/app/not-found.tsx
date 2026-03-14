import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NotFoundContent } from "./not-found-content";

export default async function NotFound() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const role = (profile as { role?: string } | null)?.role ?? "deneyap";
  const dashboardHref =
    role === "deneyap"
      ? "/dashboard/deneyap"
      : role === "bolge"
        ? "/dashboard/bolge"
        : role === "koordinator"
          ? "/dashboard/koordinator"
          : role === "muhasebe"
            ? "/dashboard/muhasebe"
            : role === "yk"
              ? "/dashboard/yk"
              : role === "il"
                ? "/dashboard/il"
                : "/dashboard/deneyap";

  return (
    <NotFoundContent dashboardHref={user ? dashboardHref : "/dashboard"} />
  );
}
