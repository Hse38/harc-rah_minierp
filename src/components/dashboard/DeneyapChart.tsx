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

type ChartData = { ay: string; toplam: number }[];

export function DeneyapChart({ data }: { data: ChartData }) {
  return (
    <div className="h-44 lg:h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <XAxis dataKey="ay" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v} ₺`} />
          <Tooltip formatter={(v: number) => [formatCurrency(v), "Toplam"]} />
          <Bar dataKey="toplam" fill="#2563EB" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
