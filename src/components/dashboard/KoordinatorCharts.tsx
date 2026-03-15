"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CHART_COLORS, formatCurrencyTR } from "@/lib/dashboard-theme";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { CHART_GRID_STROKE, CHART_GRID_STROKE_DASHARRAY } from "@/lib/dashboard-theme";

const BOLGELER = ["marmara", "ege", "karadeniz", "iç anadolu", "akdeniz", "doğu anadolu", "güneydoğu anadolu"];

/** ay: month label (string), other keys (region names): number */
type RegionTrendItem = { [key: string]: number | string; ay: string };
type ApprovalTimeItem = { bolge: string; ortalamaSaat: number };
type TypeChartItem = { tür: string; toplam: number };

export function KoordinatorCharts({
  regionTrendData,
  approvalTimeByRegion,
  typeChartData,
}: {
  regionTrendData: RegionTrendItem[];
  approvalTimeByRegion: ApprovalTimeItem[];
  typeChartData: TypeChartItem[];
}) {
  return (
    <>
      {(regionTrendData.length > 0 || true) && (
        <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
          <CardContent className="p-4 md:p-5">
            <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-3">Bölge Bazlı Trend (Son 6 Ay)</h3>
            <div className="h-56 md:h-[280px]">
              {(() => {
                const hasAny = regionTrendData.some((r) => BOLGELER.some((b) => (r[b] as number) > 0));
                if (!hasAny) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <p className="text-sm font-medium">Henüz veri yok</p>
                    </div>
                  );
                }
                const regionsWithData = BOLGELER.filter((b) => regionTrendData.some((r) => (r[b] as number) > 0)).slice(0, 6);
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={regionTrendData} margin={{ top: 8, right: 8, left: -10, bottom: 5 }}>
                      <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray={CHART_GRID_STROKE_DASHARRAY} vertical={false} />
                      <XAxis dataKey="ay" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyTR(v)} />
                      <Tooltip formatter={(v: number) => [formatCurrencyTR(v), "Tutar"]} contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                      <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                      {regionsWithData.map((b, i) => (
                        <Line key={b} type="monotone" dataKey={b} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} isAnimationActive connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {approvalTimeByRegion.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
          <CardContent className="p-4 md:p-5">
            <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-3">Ortalama onay süresi (saat)</h3>
            <div className="h-44 md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={approvalTimeByRegion} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <XAxis dataKey="bolge" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)} saat`, "Ortalama"]} contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Bar dataKey="ortalamaSaat" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} barSize={32} isAnimationActive />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {typeChartData.some((d) => d.toplam > 0) && (
        <Card className="rounded-2xl shadow-sm border-gray-200 overflow-hidden">
          <CardContent className="p-4 md:p-5">
            <h3 className="text-sm md:text-[14px] font-semibold text-[#374151] mb-3">Harcama türü dağılımı</h3>
            <div className="h-48 md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeChartData.filter((d) => d.toplam > 0)}
                    dataKey="toplam"
                    nameKey="tür"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={2}
                    label={false}
                  >
                    {typeChartData.filter((d) => d.toplam > 0).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrencyTR(v)} contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
