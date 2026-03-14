"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NotFoundContent({ dashboardHref }: { dashboardHref: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0F172A 0%, #1E3A5F 100%)",
      }}
    >
      <div
        className="login-orb login-orb-1 w-72 h-72"
        style={{ left: "10%", top: "15%", background: "#3B82F6" }}
      />
      <div
        className="login-orb login-orb-2 w-64 h-64"
        style={{ right: "5%", top: "40%", background: "#7C3AED" }}
      />
      <div
        className="login-orb login-orb-3 w-80 h-80"
        style={{ left: "20%", bottom: "20%", background: "#2563EB" }}
      />

      <div
        className="w-full max-w-[380px] rounded-2xl p-8 relative z-10 text-center backdrop-blur-md border"
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderColor: "rgba(255, 255, 255, 0.2)",
        }}
      >
        <p
          className="text-6xl sm:text-7xl font-bold tracking-tight"
          style={{ color: "#2563EB" }}
        >
          404
        </p>
        <h1 className="text-xl font-semibold text-white mt-4">Sayfa Bulunamadı</h1>
        <p className="text-sm text-white/80 mt-2">
          Aradığınız sayfa mevcut değil veya erişim yetkiniz yok.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
            <Link href={dashboardHref}>Ana Sayfaya Dön</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10">
            <Link href="/login">Giriş Sayfasına Git</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
