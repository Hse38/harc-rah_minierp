"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type RegionItem = { bolge: string; toplam: number };

export function RegionChart({ data }: { data: RegionItem[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <XAxis type="number" tickFormatter={(v) => `${v} ₺`} />
          <YAxis type="category" dataKey="bolge" width={80} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: number) => [formatCurrency(v), "Toplam"]}
            labelFormatter={(l) => l}
          />
          <Bar dataKey="toplam" fill="#2563EB" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
