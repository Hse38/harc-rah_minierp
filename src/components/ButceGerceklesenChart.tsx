"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";
import { bolgeAdi, formatCurrency } from "@/lib/utils";

export type ButceGerceklesenRow = {
  bolge: string;
  limit: number;
  gerceklesen: number;
  yuzde: number;
};

function colorFor(pct: number) {
  if (pct >= 90) return "#EF4444"; // red
  if (pct >= 70) return "#F59E0B"; // orange
  return "#22C55E"; // green
}

export function ButceGerceklesenChart({ data }: { data: ButceGerceklesenRow[] }) {
  const rows = useMemo(
    () =>
      (data ?? []).map((r) => ({
        ...r,
        bolgeLabel: bolgeAdi(r.bolge) || r.bolge,
        usedColor: colorFor(Number(r.yuzde ?? 0)),
      })),
    [data]
  );

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bolgeLabel" tick={{ fontSize: 12 }} interval={0} angle={-10} height={50} />
          <YAxis tickFormatter={(v) => formatCurrency(Number(v))} width={84} />
          <Tooltip
            formatter={(v: unknown) => formatCurrency(Number(v))}
            labelFormatter={(l) => String(l)}
          />

          <Bar dataKey="limit" name="Limit" fill="#2563EB" radius={[6, 6, 0, 0]}>
            <LabelList dataKey="yuzde" position="top" formatter={(v: unknown) => `${Number(v) || 0}%`} />
          </Bar>
          <Bar
            dataKey="gerceklesen"
            name="Gerçekleşen"
            radius={[6, 6, 0, 0]}
            fill="#22C55E"
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full border px-2 py-0.5">Yeşil: &lt; %70</span>
        <span className="rounded-full border px-2 py-0.5">Turuncu: %70–90</span>
        <span className="rounded-full border px-2 py-0.5">Kırmızı: &gt; %90</span>
      </div>
    </div>
  );
}

