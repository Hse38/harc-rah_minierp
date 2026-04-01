"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function YeniHarcamaFAB({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Yeni Harcama"
      title="Yeni Harcama"
      className="hidden md:flex fixed bottom-6 right-6 z-50 h-14 w-14 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
}

