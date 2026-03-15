"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCurrencyTR } from "@/lib/dashboard-theme";
import { DASHBOARD_COLORS, CHART_GRID_STROKE, CHART_GRID_STROKE_DASHARRAY } from "@/lib/dashboard-theme";

type ChartData = { ay: string; toplam: number }[];

export function DeneyapChart({ data }: { data: ChartData }) {
  return (
    <div className="h-44 md:h-[280px] lg:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="deneyapAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DASHBOARD_COLORS.primary} stopOpacity={0.3} />
              <stop offset="100%" stopColor={DASHBOARD_COLORS.primary} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray={CHART_GRID_STROKE_DASHARRAY} vertical={false} />
          <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyTR(v)} />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            formatter={(value: number) => [formatCurrencyTR(value), "Toplam"]}
            labelFormatter={(label) => label}
          />
          <Area
            type="monotone"
            dataKey="toplam"
            stroke={DASHBOARD_COLORS.primary}
            strokeWidth={2}
            fill="url(#deneyapAreaFill)"
            fillOpacity={0.15}
            isAnimationActive={true}
            dot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
