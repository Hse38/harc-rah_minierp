"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type BottomNavTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  href?: string;
};

export function BottomNav({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: BottomNavTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-4 pb-3 pb-safe z-30 md:hidden">
      <nav
        className="h-[68px] rounded-2xl border border-gray-100 bg-white flex items-center justify-around"
        style={{ boxShadow: "0 -1px 12px rgba(0,0,0,0.06)" }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const content = (
            <>
              <span className="relative inline-block">
                <tab.icon
                  className="h-[22px] w-[22px]"
                  style={{ color: isActive ? "#2563EB" : "#9CA3AF" }}
                />
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute -top-0.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </span>
              <span
                className="text-[11px] font-medium"
                style={{ color: isActive ? "#2563EB" : "#9CA3AF" }}
              >
                {tab.label}
              </span>
            </>
          );
          const pillClass = `flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 px-4 transition-all duration-200 ease-in-out ${
            isActive ? "bg-[#EFF6FF]" : ""
          }`;

          if (tab.href) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="flex flex-1 items-center justify-center transition-all duration-200 ease-in-out"
              >
                <span className={pillClass}>{content}</span>
              </Link>
            );
          }
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="flex flex-1 items-center justify-center transition-all duration-200 ease-in-out"
            >
              <span className={pillClass}>{content}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
