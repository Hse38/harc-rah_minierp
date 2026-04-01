import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Shortcut = {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: { src: string; sizes?: string; type?: string }[];
};

function shortcutsForRole(role: string): Shortcut[] {
  const icon = [{ src: "/icon.svg", type: "image/svg+xml" }];
  if (role === "deneyap") {
    return [
      { name: "Yeni Harcama", short_name: "Yeni", url: "/dashboard/deneyap/yeni", icons: icon },
      { name: "Harcamalarım", short_name: "Liste", url: "/dashboard/deneyap", icons: icon },
    ];
  }
  if (role === "il") {
    return [
      { name: "Yeni Harcama", short_name: "Yeni", url: "/dashboard/il/yeni", icons: icon },
      { name: "Harcamalar", short_name: "Liste", url: "/dashboard/il?tab=list", icons: icon },
    ];
  }
  if (role === "bolge") {
    return [
      { name: "Bekleyen Onaylar", short_name: "Bekleyen", url: "/dashboard/bolge?tab=pending", icons: icon },
      { name: "Yeni Harcama", short_name: "Yeni", url: "/dashboard/bolge/yeni", icons: icon },
    ];
  }
  if (role === "koordinator") {
    return [
      { name: "Bekleyen Onaylar", short_name: "Bekleyen", url: "/dashboard/koordinator?tab=awaiting", icons: icon },
      { name: "Limitler", short_name: "Limit", url: "/dashboard/koordinator?tab=limits", icons: icon },
    ];
  }
  if (role === "muhasebe") {
    return [{ name: "Ödeme Bekleyenler", short_name: "Ödeme", url: "/dashboard/muhasebe", icons: icon }];
  }
  if (role === "admin") {
    return [{ name: "Admin", short_name: "Admin", url: "/dashboard/admin", icons: icon }];
  }
  if (role === "yk") {
    return [{ name: "Dashboard", short_name: "YK", url: "/dashboard/yk", icons: icon }];
  }
  return [{ name: "Dashboard", short_name: "Giriş", url: "/login", icons: icon }];
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = "guest";
  if (user?.id) {
    const { data: p } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = (p as { role?: string } | null)?.role ?? "guest";
  }

  const manifest = {
    name: "TAMGA",
    short_name: "TAMGA",
    description: "TAMGA Onay ve Ödeme Yönetimi",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#2563EB",
    icons: [{ src: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
    shortcuts: shortcutsForRole(role),
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

