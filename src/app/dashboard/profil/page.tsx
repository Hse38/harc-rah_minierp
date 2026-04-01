import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server"; // createClient() uses createServerClient internally
import type { Profile } from "@/types";
import { DEFAULT_NOTIFICATION_PREFS } from "@/types";
import { ProfilClient } from "./ProfilClient";

const PROFILE_SELECT =
  "id,full_name,iban,role,il,bolge,phone,created_at,language,notification_prefs,izin_modu,izin_vekil_id,izin_baslangic,izin_bitis";

export default async function ProfilPage() {
  console.log("Profil sayfası yükleniyor...");

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log("Auth user:", user?.id, authError);

  if (!user) redirect("/login");

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .single();

  console.log("Profile:", profile, profileError);
  if (profileError) {
    console.error("Profile error details:", {
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
    });
  }

  let profileData: Profile | null = (profile as Profile | null) ?? null;

  if (!profileData) {
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
    profileData = (after as Profile) ?? null;
  }

  const email = user.email ?? "";

  const lastSignInAt =
    (user as { last_sign_in_at?: string }).last_sign_in_at ?? user.created_at;

  return (
    <div className="max-w-4xl mx-auto">
      <ProfilClient
        initialProfile={profileData}
        email={email}
        sessionCreatedAt={lastSignInAt}
      />
    </div>
  );
}
