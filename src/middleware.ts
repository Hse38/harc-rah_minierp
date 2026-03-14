import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DASHBOARD_PATHS = [
  "/deneyap",
  "/il",
  "/bolge",
  "/koordinator",
  "/muhasebe",
  "/yk",
] as const;

const ROLE_PATHS: Record<string, string[]> = {
  deneyap: ["/deneyap"],
  il: ["/il"],
  bolge: ["/bolge"],
  koordinator: ["/koordinator", "/yk"],
  muhasebe: ["/muhasebe"],
  yk: ["/yk", "/koordinator"],
};

function getRedirectForRole(role: string): string {
  const first = ROLE_PATHS[role]?.[0];
  return first ? `/dashboard${first}` : "/dashboard/deneyap";
}

function pathAllowedForRole(pathname: string, role: string): boolean {
  const base = pathname.replace(/^\/dashboard/, "") || "/";
  const allowed = ROLE_PATHS[role];
  if (!allowed) return false;
  return allowed.some((p) => base === p || base.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDashboard =
    pathname.startsWith("/dashboard") &&
    DASHBOARD_PATHS.some((p) =>
      pathname === `/dashboard${p}` || pathname.startsWith(`/dashboard${p}/`)
    );
  const isLogin = pathname === "/login" || pathname === "/dashboard/login";

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && isDashboard) {
    const role = (user.user_metadata?.role as string) || "";
    const profileRes = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const profileRole = (profileRes.data as { role?: string } | null)?.role;
    const effectiveRole = profileRole || role;

    const allowed = pathAllowedForRole(pathname, effectiveRole);
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = getRedirectForRole(effectiveRole);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
  ],
};
