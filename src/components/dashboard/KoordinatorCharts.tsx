"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
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
} from "recharts";

const BOLGELER = ["marmara", "ege", "karadeniz", "iç anadolu", "akdeniz", "doğu anadolu", "güneydoğu anadolu"];
const PIE_COLORS = ["#2563EB", "#22C55E", "#EAB308", "#F97316", "#64748B"];

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
      {regionTrendData.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Bölge bazlı trend (son 6 ay)</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={regionTrendData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <XAxis dataKey="ay" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), "Tutar"]} />
                  <Legend />
                  {BOLGELER.slice(0, 5).map((b, i) => (
                    <Line
                      key={b}
                      type="monotone"
                      dataKey={b}
                      stroke={PIE_COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {approvalTimeByRegion.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Ortalama onay süresi (saat)</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={approvalTimeByRegion} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <XAxis dataKey="bolge" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)} saat`, "Ortalama"]} />
                  <Bar dataKey="ortalamaSaat" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {typeChartData.some((d) => d.toplam > 0) && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Harcama türü dağılımı</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeChartData.filter((d) => d.toplam > 0)}
                    dataKey="toplam"
                    nameKey="tür"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    label={({ tür, toplam }: { tür: string; toplam: number }) => `${tür}: ${formatCurrency(toplam)}`}
                  >
                    {typeChartData.filter((d) => d.toplam > 0).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
