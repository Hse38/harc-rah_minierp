import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { PushPermissionBanner } from "@/components/layout/push-permission-banner";
import { PushNotificationSetup } from "@/components/layout/PushNotificationSetup";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AnnouncementsProvider } from "@/contexts/AnnouncementsContext";
import type { Language } from "@/lib/i18n";
import { KeyboardShortcutsRoot } from "@/components/KeyboardShortcutsRoot";

function isNextRedirect(e: unknown): boolean {
  return !!(
    e &&
    typeof e === "object" &&
    "digest" in e &&
    String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { id: string } | null = null;
  let fullName = "";
  let role = "deneyap";
  let profileLang: string | undefined;

  try {
    const supabase = await createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      redirect("/login");
    }
    user = u;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, language")
      .eq("id", u.id)
      .single();
    const p = profile as { full_name?: string; role?: string; language?: string } | null;
    fullName = p?.full_name ?? "";
    role = p?.role ?? "deneyap";
    profileLang = p?.language;
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    console.error("[DashboardLayout]", e);
    redirect("/login");
  }

  if (!user) redirect("/login");

  const initialLang: Language =
    profileLang === "az" || profileLang === "ky" ? profileLang : "tr";

  return (
    <LanguageProvider initialLang={initialLang}>
      <div className="min-h-screen bg-slate-50 md:flex">
        <DashboardSidebar userName={fullName} userRole={role} />
        <AnnouncementsProvider userId={user.id}>
          <div className="w-full max-w-[430px] mx-auto shadow-lg md:ml-40 lg:ml-64 md:max-w-[480px] md:mx-0 lg:max-w-none lg:flex-1 lg:min-w-0 flex flex-col">
            <Topbar
              userName={fullName}
              userRole={role}
              userId={user.id}
            />
            <PushNotificationSetup userId={user.id} />
            <PushPermissionBanner userId={user.id} />
            <main className="flex-1 p-4 pb-safe md:p-6 md:px-8 max-w-6xl mx-auto w-full flex flex-col">
              <AnnouncementBanner />
              <div className="flex-1">{children}</div>
            </main>
            <KeyboardShortcutsRoot role={role as any} />
          </div>
        </AnnouncementsProvider>
      </div>
    </LanguageProvider>
  );
}
