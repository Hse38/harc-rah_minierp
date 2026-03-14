"use client";

import { cn } from "@/lib/utils";

export function DashboardHeader({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 lg:mb-6 lg:pb-4 lg:border-b lg:border-gray-200",
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-800 lg:text-2xl lg:font-semibold lg:text-gray-900">
          {title}
        </h1>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
