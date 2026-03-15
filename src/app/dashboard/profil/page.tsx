import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import { DEFAULT_NOTIFICATION_PREFS } from "@/types";
import { ProfilClient } from "./ProfilClient";

const PROFILE_SELECT =
  "id,full_name,iban,role,il,bolge,phone,created_at,language,notification_prefs";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let profile: Profile | null = null;
  const { data: p } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .single();

  profile = p as Profile | null;

  if (!profile) {
    const fullName =
      (user.user_metadata?.full_name as string) || user.email || "Kullanıcı";
    const { error: insertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: fullName,
        role: "deneyap",
        il: null,
        bolge: null,
        iban: null,
        phone: null,
        language: "tr",
        notification_prefs: DEFAULT_NOTIFICATION_PREFS,
      },
      { onConflict: "id" }
    );
    if (insertError) {
      console.error("[ProfilPage] upsert profile error:", insertError);
    }
    const { data: after } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", user.id)
      .single();
    profile = (after as Profile) ?? null;
  }

  const email = user.email ?? "";

  const lastSignInAt =
    (user as { last_sign_in_at?: string }).last_sign_in_at ?? user.created_at;

  return (
    <ProfilClient
      initialProfile={profile}
      email={email}
      sessionCreatedAt={lastSignInAt}
    />
  );
}
