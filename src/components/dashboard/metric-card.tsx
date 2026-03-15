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

export type MetricCardBorderColor = keyof typeof BORDER_COLORS;

export function MetricCard({
  title,
  label,
  value,
  subtitle,
  trend,
  borderColor = "primary",
  className,
}: {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  trend?: { text: string; up?: boolean };
  borderColor?: MetricCardBorderColor;
  className?: string;
}) {
  const text = label ?? title ?? "";
  const border = BORDER_COLORS[borderColor] ?? BORDER_COLORS.primary;
  const trendLine = trend ?? (subtitle ? { text: subtitle } : undefined);
  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-sm p-4 md:p-5 transition-all duration-200",
        "md:hover:shadow-md md:hover:-translate-y-0.5",
        className
      )}
      style={{ borderLeft: `4px solid ${border}` }}
    >
      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{text}</p>
      <p className="text-2xl md:text-[28px] font-bold text-gray-900 mt-1 tracking-tight">{value}</p>
      {trendLine && (
        <p
          className={cn(
            "text-xs mt-2 flex items-center gap-1",
            trendLine.up === true ? "text-[#059669]" : trendLine.up === false ? "text-[#DC2626]" : "text-gray-500"
          )}
        >
          {trendLine.up === true && <TrendingUp className="h-3.5 w-3.5" />}
          {trendLine.up === false && <TrendingDown className="h-3.5 w-3.5" />}
          {trendLine.text}
        </p>
      )}
    </div>
  );
}
