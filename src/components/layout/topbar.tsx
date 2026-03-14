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
    <header className="sticky top-0 z-40 w-full max-w-[430px] md:max-w-full mx-auto border-b border-slate-200 lg:border-b lg:border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-14 lg:h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-slate-800 truncate lg:text-lg">
            tamga-erp Sistemi
          </span>
        </div>
        <div className="flex items-center gap-1 lg:gap-3">
          <NotificationBell userId={userId} userRole={userRole} />
          <Link
            href="/dashboard/profil"
            className="hidden sm:flex flex-col items-end max-w-[120px] cursor-pointer hover:underline underline-offset-2 lg:flex-row lg:items-center lg:gap-2 lg:max-w-none"
          >
            <span className="hidden lg:inline-flex w-8 h-8 rounded-full bg-gray-200 text-gray-600 items-center justify-center text-sm font-medium shrink-0">
              {(userName || "K").charAt(0).toUpperCase()}
            </span>
            <span className="text-xs font-medium text-slate-700 truncate w-full text-right lg:text-sm">
              {userName || "Kullanıcı"}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 lg:text-xs">
              {ROLE_LABELS[userRole] ?? userRole}
            </Badge>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Çıkış"
            className="lg:hover:bg-gray-100"
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
