"use client";

import { cn } from "@/lib/utils";

export function AnalyticsChart({
  title,
  subtitle,
  filter,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  filter?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden",
        "p-4 lg:p-5",
        className
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-slate-700 lg:text-base text-gray-900">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {filter && <div className="mt-2 sm:mt-0">{filter}</div>}
      </div>
      <div className="min-h-[180px] lg:min-h-[220px]">{children}</div>
    </div>
  );
}
