"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Loader2 } from "lucide-react";

const T3_LOGO_URL = "https://raw.githubusercontent.com/Hse38/t3logo/main/1.T3%20dikey.png";

const ROLE_REDIRECT: Record<string, string> = {
  deneyap: "/dashboard/deneyap",
  il: "/dashboard/il",
  bolge: "/dashboard/bolge",
  koordinator: "/dashboard/koordinator",
  muhasebe: "/dashboard/muhasebe",
  yk: "/dashboard/yk",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("E-posta ve şifre girin.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(
          authError.message.includes("Invalid login")
            ? "E-posta veya şifre hatalı."
            : authError.message
        );
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      const role = (profile as { role?: string } | null)?.role ?? "deneyap";
      const path = ROLE_REDIRECT[role] ?? "/dashboard/deneyap";
      router.push(path);
      router.refresh();
    } catch {
      setError("Giriş yapılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0F172A 0%, #1E3A5F 100%)",
      }}
    >
      {/* 3 floating orbs */}
      <div className="login-orb login-orb-1 w-72 h-72" style={{ left: "10%", top: "15%", background: "#3B82F6" }} />
      <div className="login-orb login-orb-2 w-64 h-64" style={{ right: "5%", top: "40%", background: "#7C3AED" }} />
      <div className="login-orb login-orb-3 w-80 h-80" style={{ left: "20%", bottom: "20%", background: "#2563EB" }} />

      <div className="w-full max-w-[430px] mx-auto relative z-10">
        <div
          className="rounded-2xl p-6 sm:p-8 space-y-6 backdrop-blur-md border"
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderColor: "rgba(255, 255, 255, 0.2)",
          }}
        >
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center rounded-2xl bg-white/10 border border-white/20 p-3">
              <Image
                src={T3_LOGO_URL}
                alt="T3 Vakfı"
                width={120}
                height={120}
                className="object-contain"
                priority
                unoptimized={false}
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Harcırah Sistemi
            </h1>
            <p className="text-sm text-white/70">T3 Vakfı · Deneyap Teknoloji Atölyeleri</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90 text-sm font-medium">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@t3vakfi.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className="h-12 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30 focus-visible:border-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/90 text-sm font-medium">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                className="h-12 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30 focus-visible:border-white/30"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 border-0 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş yap"
              )}
            </Button>
          </form>

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm text-red-100 text-center"
              style={{ background: "rgba(220, 38, 38, 0.25)", border: "1px solid rgba(248, 113, 113, 0.4)" }}
            >
              {error}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          © 2026 T3 Vakfı. Yetkisiz erişim yasaktır.
        </p>
      </div>
    </div>
  );
}
