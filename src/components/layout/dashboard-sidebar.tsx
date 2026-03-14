"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  BarChart2,
  List,
  Plus,
  Clock,
  CheckCircle,
  Download,
  Wallet,
  LayoutDashboard,
  MapPin,
  User,
  LogOut,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  deneyap: "Deneyap",
  il: "İl Sorumlusu",
  bolge: "Bölge Sorumlusu",
  koordinator: "Koordinatör",
  muhasebe: "Muhasebe",
  yk: "YK Başkanı",
};

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };

function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case "deneyap":
      return [
        { label: "Dashboard", href: "/dashboard/deneyap?tab=dashboard", icon: BarChart2 },
        { label: "Harcamalarım", href: "/dashboard/deneyap?tab=list", icon: List },
        { label: "Yeni Harcama", href: "/dashboard/deneyap/yeni", icon: Plus },
      ];
    case "il":
      return [
        { label: "Dashboard", href: "/dashboard/il?tab=dashboard", icon: BarChart2 },
        { label: "Harcamalar", href: "/dashboard/il?tab=list", icon: List },
      ];
    case "bolge":
      return [
        { label: "Dashboard", href: "/dashboard/bolge?tab=dashboard", icon: BarChart2 },
        { label: "Bekleyenler", href: "/dashboard/bolge?tab=pending", icon: Clock },
        { label: "Sonuçlananlar", href: "/dashboard/bolge?tab=done", icon: CheckCircle },
      ];
    case "koordinator":
      return [
        { label: "Dashboard", href: "/dashboard/koordinator?tab=dashboard", icon: BarChart2 },
        { label: "Onay Bekleyen", href: "/dashboard/koordinator?tab=awaiting", icon: Clock },
        { label: "Tamamlananlar", href: "/dashboard/koordinator?tab=completed", icon: CheckCircle },
        { label: "Limitler", href: "/dashboard/koordinator?tab=limits", icon: Wallet },
      ];
    case "muhasebe":
      return [
        { label: "Bekleyenler", href: "/dashboard/muhasebe?tab=awaiting", icon: Clock },
        { label: "Ödenenler", href: "/dashboard/muhasebe?tab=paid", icon: CheckCircle },
        { label: "Export", href: "/dashboard/muhasebe?tab=export", icon: Download },
      ];
    case "yk":
      return [
        { label: "Genel", href: "/dashboard/yk?tab=genel", icon: LayoutDashboard },
        { label: "Bölgeler", href: "/dashboard/yk?tab=bolgeler", icon: MapPin },
        { label: "Harcamalar", href: "/dashboard/yk?tab=harcamalar", icon: List },
      ];
    default:
      return [{ label: "Ana Sayfa", href: "/dashboard", icon: BarChart2 }];
  }
}

export function DashboardSidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const tab = searchParams.get("tab");
  const navItems = getNavForRole(userRole);

  function isActive(href: string): boolean {
    const [path] = href.split("?");
    const qs = href.includes("?") ? href.split("?")[1] : "";
    if (pathname !== path && !pathname.startsWith(path + "/")) return false;
    if (!qs) return pathname === path || pathname.startsWith(path + "/");
    const param = qs.replace("tab=", "");
    return tab === param;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 w-40 bg-white border-r border-slate-200 z-50">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm">
            H
          </div>
          <span className="font-semibold text-slate-800 text-sm">Harcırah</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Sistemi</p>
      </div>
      <div className="p-3 border-b border-slate-100">
        <p className="text-xs font-medium text-slate-700 truncate" title={userName}>
          {userName || "Kullanıcı"}
        </p>
        <Badge variant="secondary" className="text-[10px] mt-1">
          {ROLE_LABELS[userRole] ?? userRole}
        </Badge>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[#EFF6FF] text-[#2563EB] font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t border-slate-100 space-y-0.5">
        <Link
          href="/dashboard/profil"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">Profil</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="truncate">Çıkış</span>
        </button>
      </div>
    </aside>
  );
}
