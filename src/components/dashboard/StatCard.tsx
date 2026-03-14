import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  trend?: { text: string; up?: boolean };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition",
        className
      )}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-gray-900 mt-1">
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            "text-xs mt-1",
            trend.up === true ? "text-green-600" : trend.up === false ? "text-red-600" : "text-gray-500"
          )}
        >
          {trend.text}
        </p>
      )}
    </div>
  );
}
