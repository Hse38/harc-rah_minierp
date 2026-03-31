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
  Users,
  FileText,
  Receipt,
  Megaphone,
  Activity,
  TrendingUp,
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
        { labelKey: "nav_dashboard", href: "/dashboard/deneyap?tab=dashboard", icon: BarChart2 },
        { labelKey: "nav_my_expenses", href: "/dashboard/deneyap?tab=list", icon: List },
        { labelKey: "nav_new_expense", href: "/dashboard/deneyap/yeni", icon: Plus },
      ];
    case "il":
      return [
        { labelKey: "nav_dashboard", href: "/dashboard/il?tab=dashboard", icon: BarChart2 },
        { labelKey: "nav_my_expenses", href: "/dashboard/il?tab=list", icon: List },
        { labelKey: "nav_new_expense", href: "/dashboard/il/yeni", icon: Plus },
      ];
    case "bolge":
      return [
        { labelKey: "nav_dashboard", href: "/dashboard/bolge?tab=dashboard", icon: BarChart2 },
        { labelKey: "nav_pending", href: "/dashboard/bolge?tab=pending", icon: Clock },
        { labelKey: "nav_done", href: "/dashboard/bolge?tab=done", icon: CheckCircle },
        { labelKey: "nav_new_expense", href: "/dashboard/bolge/yeni", icon: Plus },
      ];
    case "koordinator":
      return [
        { labelKey: "nav_dashboard", href: "/dashboard/koordinator?tab=dashboard", icon: BarChart2 },
        { labelKey: "nav_awaiting", href: "/dashboard/koordinator?tab=awaiting", icon: Clock },
        { labelKey: "nav_completed", href: "/dashboard/koordinator?tab=completed", icon: CheckCircle },
        { labelKey: "nav_limits", href: "/dashboard/koordinator?tab=limits", icon: Wallet },
        { labelKey: "nav_statistics", href: "/dashboard/koordinator/istatistikler", icon: TrendingUp },
      ];
    case "muhasebe":
      return [
        { labelKey: "nav_pending", href: "/dashboard/muhasebe?tab=awaiting", icon: Clock },
        { labelKey: "muh_paid", href: "/dashboard/muhasebe?tab=paid", icon: CheckCircle },
        { labelKey: "nav_export", href: "/dashboard/muhasebe?tab=export", icon: Download },
      ];
    case "yk":
      return [
        { labelKey: "nav_general", href: "/dashboard/yk?tab=genel", icon: LayoutDashboard },
        { labelKey: "nav_regions", href: "/dashboard/yk?tab=bolgeler", icon: MapPin },
        { labelKey: "nav_all_expenses", href: "/dashboard/yk?tab=harcamalar", icon: List },
        { labelKey: "nav_statistics", href: "/dashboard/koordinator/istatistikler", icon: TrendingUp },
      ];
    case "admin":
      return [
        { labelKey: "nav_dashboard", href: "/dashboard/admin", icon: BarChart2 },
        { labelKey: "admin_nav_users", href: "/dashboard/admin/kullanicilar", icon: Users },
        { labelKey: "admin_nav_expenses", href: "/dashboard/admin/harcamalar", icon: FileText },
        { labelKey: "admin_nav_receipt_archive", href: "/dashboard/admin/fis-arsivi", icon: Receipt },
        { labelKey: "nav_statistics", href: "/dashboard/koordinator/istatistikler", icon: TrendingUp },
        { labelKey: "admin_nav_announcements", href: "/dashboard/admin/duyurular", icon: Megaphone },
        { labelKey: "admin_nav_logs", href: "/dashboard/admin/loglar", icon: Activity },
      ];
    default:
      return [{ labelKey: "nav_dashboard", href: "/dashboard", icon: BarChart2 }];
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

  const isAdmin = userRole === "admin";
  const asideClass = isAdmin
    ? "hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 w-40 lg:w-64 bg-[#1E293B] border-r border-slate-700 z-50"
    : "hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 w-40 lg:w-64 bg-white border-r border-slate-200 z-50";
  const headerBorder = isAdmin ? "border-slate-700" : "border-slate-100";
  const logoBg = isAdmin ? "bg-slate-700/50 border-slate-600" : "bg-slate-100 border-slate-200/80";
  const titleClass = isAdmin ? "font-bold text-white text-base lg:text-lg tracking-tight uppercase" : "font-bold text-slate-900 text-base lg:text-lg tracking-tight uppercase";

  return (
    <aside className={asideClass}>
      <div className={`p-4 lg:p-5 border-b ${headerBorder}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 shadow-sm ${logoBg}`}>
            <Image
              src={T3_LOGO_URL}
              alt="TAMGA"
              width={40}
              height={40}
              className="object-contain p-0.5"
              priority
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={titleClass}>TAMGA</span>
            {isAdmin && (
              <span className="text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full w-fit">ADMİN</span>
            )}
          </div>
        </div>
      </div>
      <div className={`p-3 lg:p-4 border-b ${headerBorder}`}>
        <p className={`text-xs font-medium truncate ${isAdmin ? "text-slate-300" : "text-slate-700"}`} title={userName}>
          {userName || "Kullanıcı"}
        </p>
        {!isAdmin && (
          <Badge variant="secondary" className="text-[10px] mt-1">
            {t(
              (userRole === "bolge" ? "misc_bölge_sorumlusu" : userRole === "il" ? "misc_il_sorumlusu" : userRole === "koordinator" ? "misc_koordinator" : userRole === "muhasebe" ? "misc_muhasebe" : userRole === "yk" ? "misc_yk" : "misc_deneyap") as TranslationKey,
              lang
            )}
          </Badge>
        )}
      </div>
      <nav className="flex-1 p-2 lg:p-3 space-y-0.5 lg:space-y-1 overflow-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const linkClass = isAdmin
            ? active
              ? "bg-slate-700 text-white font-medium"
              : "text-slate-200 hover:bg-slate-700"
            : active
              ? "bg-[#EFF6FF] text-[#2563EB] font-medium lg:bg-blue-50 lg:border-l-2 lg:border-l-[#2563EB] lg:pl-[10px]"
              : "text-slate-600 hover:bg-slate-100 lg:hover:bg-slate-50";
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex items-center gap-2 rounded-lg px-3 py-2 lg:py-2.5 text-sm transition-colors ${linkClass}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(item.labelKey, lang)}</span>
            </Link>
          );
        })}
      </nav>
      <div className={`p-2 lg:p-3 border-t ${headerBorder} space-y-0.5`}>
        <Link
          href="/dashboard/profil"
          prefetch
          className={`flex items-center gap-2 rounded-lg px-3 py-2 lg:py-2.5 text-sm transition-colors ${isAdmin ? "text-slate-300 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("nav_profile", lang)}</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 lg:py-2.5 text-sm transition-colors text-left ${isAdmin ? "text-slate-300 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("nav_logout", lang)}</span>
        </button>
      </div>
    </aside>
  );
}
