"use client";

import Link from "next/link";
import Image from "next/image";
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
import { useLang } from "@/contexts/LanguageContext";
import { t, type TranslationKey } from "@/lib/i18n";

const T3_LOGO_URL = "https://raw.githubusercontent.com/Hse38/t3logo/main/1.T3%20dikey.png";

const ROLE_LABELS: Record<string, string> = {
  deneyap: "Deneyap",
  il: "İl Sorumlusu",
  bolge: "Bölge Sorumlusu",
  koordinator: "Koordinatör",
  muhasebe: "Muhasebe",
  yk: "YK Başkanı",
};

type NavItem = { labelKey: TranslationKey; href: string; icon: React.ComponentType<{ className?: string }> };

function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case "deneyap":
      return [
        { labelKey: "dashboard", href: "/dashboard/deneyap?tab=dashboard", icon: BarChart2 },
        { labelKey: "myExpenses", href: "/dashboard/deneyap?tab=list", icon: List },
        { labelKey: "newExpense", href: "/dashboard/deneyap/yeni", icon: Plus },
      ];
    case "il":
      return [
        { labelKey: "dashboard", href: "/dashboard/il?tab=dashboard", icon: BarChart2 },
        { labelKey: "myExpenses", href: "/dashboard/il?tab=list", icon: List },
        { labelKey: "newExpense", href: "/dashboard/il/yeni", icon: Plus },
      ];
    case "bolge":
      return [
        { labelKey: "dashboard", href: "/dashboard/bolge?tab=dashboard", icon: BarChart2 },
        { labelKey: "pending", href: "/dashboard/bolge?tab=pending", icon: Clock },
        { labelKey: "done", href: "/dashboard/bolge?tab=done", icon: CheckCircle },
        { labelKey: "newExpense", href: "/dashboard/bolge/yeni", icon: Plus },
      ];
    case "koordinator":
      return [
        { labelKey: "dashboard", href: "/dashboard/koordinator?tab=dashboard", icon: BarChart2 },
        { labelKey: "awaiting", href: "/dashboard/koordinator?tab=awaiting", icon: Clock },
        { labelKey: "completed", href: "/dashboard/koordinator?tab=completed", icon: CheckCircle },
        { labelKey: "limits", href: "/dashboard/koordinator?tab=limits", icon: Wallet },
      ];
    case "muhasebe":
      return [
        { labelKey: "pending", href: "/dashboard/muhasebe?tab=awaiting", icon: Clock },
        { labelKey: "paidTab", href: "/dashboard/muhasebe?tab=paid", icon: CheckCircle },
        { labelKey: "export", href: "/dashboard/muhasebe?tab=export", icon: Download },
      ];
    case "yk":
      return [
        { labelKey: "general", href: "/dashboard/yk?tab=genel", icon: LayoutDashboard },
        { labelKey: "regions", href: "/dashboard/yk?tab=bolgeler", icon: MapPin },
        { labelKey: "myExpenses", href: "/dashboard/yk?tab=harcamalar", icon: List },
      ];
    default:
      return [{ labelKey: "dashboard", href: "/dashboard", icon: BarChart2 }];
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
  const { lang } = useLang();
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
    <aside className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 w-40 lg:w-64 bg-white border-r border-slate-200 z-50">
      <div className="p-4 lg:p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            <Image
              src={T3_LOGO_URL}
              alt="TAMGA"
              width={40}
              height={40}
              className="object-contain p-0.5"
              priority
            />
          </div>
          <span className="font-bold text-slate-900 text-base lg:text-lg tracking-tight uppercase">TAMGA</span>
        </div>
      </div>
      <div className="p-3 lg:p-4 border-b border-slate-100">
        <p className="text-xs font-medium text-slate-700 truncate" title={userName}>
          {userName || "Kullanıcı"}
        </p>
        <Badge variant="secondary" className="text-[10px] mt-1">
          {ROLE_LABELS[userRole] ?? userRole}
        </Badge>
      </div>
      <nav className="flex-1 p-2 lg:p-3 space-y-0.5 lg:space-y-1 overflow-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex items-center gap-2 rounded-lg px-3 py-2 lg:py-2.5 text-sm transition-colors ${
                active
                  ? "bg-[#EFF6FF] text-[#2563EB] font-medium lg:bg-blue-50 lg:border-l-2 lg:border-l-[#2563EB] lg:pl-[10px]"
                  : "text-slate-600 hover:bg-slate-100 lg:hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(item.labelKey, lang)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-2 lg:p-3 border-t border-slate-100 space-y-0.5">
        <Link
          href="/dashboard/profil"
          prefetch
          className="flex items-center gap-2 rounded-lg px-3 py-2 lg:py-2.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("profile", lang)}</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 lg:py-2.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors text-left"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("logout", lang)}</span>
        </button>
      </div>
    </aside>
  );
}
