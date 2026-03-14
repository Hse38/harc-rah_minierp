"use client";

import { useState, useEffect } from "react";

export default function Loading() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
        className={`flex flex-col items-center relative z-10 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold text-white animate-pulse"
          style={{ background: "#2563EB" }}
        >
          H
        </div>
        <p className="text-white text-xl font-semibold mt-4">Harcırah Sistemi</p>
        <p className="text-white/60 text-sm mt-1">T3 Vakfı</p>
        <div className="mt-6 flex gap-1">
          <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
