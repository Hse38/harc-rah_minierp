"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

const BORDER_COLORS: Record<string, string> = {
  primary: "#1E40AF",
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  purple: "#7C3AED",
  neutral: "#6B7280",
};

export type MetricCardVariant = keyof typeof BORDER_COLORS;

export function MetricCard({
  label,
  value,
  trend,
  borderColor = "primary",
  className,
}: {
  label: string;
  value: string | number;
  trend?: { text: string; up?: boolean };
  borderColor?: MetricCardVariant;
  className?: string;
}) {
  const border = BORDER_COLORS[borderColor] ?? BORDER_COLORS.primary;
  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-sm p-4 md:p-5 transition-all duration-200",
        "md:hover:shadow-md md:hover:-translate-y-0.5",
        className
      )}
      style={{ borderLeft: `4px solid ${border}` }}
    >
      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{label}</p>
      <p className="text-2xl md:text-[28px] font-bold text-gray-900 mt-1 tracking-tight">{value}</p>
      {trend && (
        <p
          className={cn(
            "text-xs mt-2 flex items-center gap-1",
            trend.up === true ? "text-[#059669]" : trend.up === false ? "text-[#DC2626]" : "text-gray-500"
          )}
        >
          {trend.up === true && <TrendingUp className="h-3.5 w-3.5" />}
          {trend.up === false && <TrendingDown className="h-3.5 w-3.5" />}
          {trend.text}
        </p>
      )}
    </div>
  );
}
