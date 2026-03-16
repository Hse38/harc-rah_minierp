"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { ExpenseStatus } from "@/types";

const LABELS: Record<ExpenseStatus, string> = {
  pending_bolge: "Bölge bekliyor",
  pending_koord: "TÇK bekliyor",
  approved_bolge: "Koord. bekliyor",
  rejected_bolge: "Reddedildi",
  approved_koord: "Onaylandı",
  rejected_koord: "Reddedildi",
  paid: "Ödendi",
  deleted: "Silindi",
};

const COLORS = ["#EAB308", "#94A3B8", "#3B82F6", "#EF4444", "#22C55E", "#EF4444", "#15803D", "#6B7280"];

type Item = { name: string; value: number; status: ExpenseStatus };

export function StatusPie({ data }: { data: Item[] }) {
  const chartData = data.map((d) => ({
    name: LABELS[d.status],
    value: d.value,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
