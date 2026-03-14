"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "./notification-bell";
import { LogOut } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  deneyap: "Deneyap",
  il: "İl Sorumlusu",
  bolge: "Bölge Sorumlusu",
  koordinator: "Koordinatör",
  muhasebe: "Muhasebe",
  yk: "YK Başkanı",
};

export function Topbar({
  userName,
  userRole,
  userId,
}: {
  userName: string;
  userRole: string;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full max-w-[430px] md:max-w-full mx-auto border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-slate-800 truncate">
            Harcırah Sistemi
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell userId={userId} userRole={userRole} />
          <Link
            href="/dashboard/profil"
            className="hidden sm:flex flex-col items-end max-w-[120px] cursor-pointer hover:underline underline-offset-2"
          >
            <span className="text-xs font-medium text-slate-700 truncate w-full text-right">
              {userName || "Kullanıcı"}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {ROLE_LABELS[userRole] ?? userRole}
            </Badge>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Çıkış"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <Link
        href="/dashboard/profil"
        className="sm:hidden flex items-center justify-between px-4 pb-2 gap-2 cursor-pointer hover:underline underline-offset-2 min-w-0"
      >
        <span className="text-sm text-slate-600 truncate">{userName}</span>
        <Badge variant="secondary" className="shrink-0">
          {ROLE_LABELS[userRole] ?? userRole}
        </Badge>
      </Link>
    </header>
  );
}
