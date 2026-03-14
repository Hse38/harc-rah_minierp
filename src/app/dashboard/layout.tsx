import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { PushPermissionBanner } from "@/components/layout/push-permission-banner";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  const fullName = (profile as { full_name?: string } | null)?.full_name ?? "";
  const role = (profile as { role?: string } | null)?.role ?? "deneyap";

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <DashboardSidebar userName={fullName} userRole={role} />
      <div className="w-full max-w-[430px] mx-auto shadow-lg md:ml-40 lg:ml-64 md:max-w-[480px] md:mx-0 lg:max-w-none lg:flex-1 lg:min-w-0 flex flex-col">
        <Topbar
          userName={fullName}
          userRole={role}
          userId={user.id}
        />
        <PushPermissionBanner userId={user.id} />
        <main className="p-4 pb-safe lg:max-w-7xl lg:mx-auto lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
