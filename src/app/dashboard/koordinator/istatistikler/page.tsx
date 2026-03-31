"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

type SistemOrt = {
  yakit_km: number | null;
  yemek_kisi: number | null;
  konaklama_gece: number | null;
  ulasim_birim: number | null;
};

type KullaniciRow = {
  user_id: string;
  ad: string;
  kategori: "Yakıt" | "Yemek" | "Konaklama" | "Ulaşım";
  islem_sayisi: number;
  toplam: number;
  ort_birim: number | null;
};

type TrendRow = {
  ay: string;
  yakit_ort: number | null;
  yemek_ort: number | null;
  konaklama_ort: number | null;
  ulasim_ort: number | null;
};

type AnomaliRow = {
  user_id: string;
  ad: string;
  kategori: string;
  ort_birim: number;
  sistem_ort: number;
};

type ApiResponse = {
  sistem_ortalamalar: SistemOrt;
  kullanici_bazli: KullaniciRow[];
  aylik_trend: TrendRow[];
  anomaliler: AnomaliRow[];
};

export default function KoordinatorIstatistiklerPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [kategori, setKategori] = useState<string>("");
  const [bolge, setBolge] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<"ort_birim" | "toplam" | "islem_sayisi">("ort_birim");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (kategori) params.set("kategori", kategori);
    if (bolge) params.set("bolge", bolge);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/kategori-istatistikler?${params.toString()}`);
    const json = (await res.json()) as ApiResponse;
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data?.kullanici_bazli ?? [];
  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av =
        sortKey === "ort_birim" ? (a.ort_birim ?? -1) : sortKey === "toplam" ? a.toplam : a.islem_sayisi;
      const bv =
        sortKey === "ort_birim" ? (b.ort_birim ?? -1) : sortKey === "toplam" ? b.toplam : b.islem_sayisi;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const ort = data?.sistem_ortalamalar;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">İstatistikler</h1>
          <p className="text-sm text-slate-600">Onaylanan/ödenen harcamalara göre birim maliyet ortalamaları</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          Yenile
        </Button>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Select value={kategori} onValueChange={setKategori}>
                <SelectTrigger>
                  <SelectValue placeholder="Hepsi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Hepsi</SelectItem>
                  <SelectItem value="Yakıt">Yakıt</SelectItem>
                  <SelectItem value="Yemek">Yemek</SelectItem>
                  <SelectItem value="Konaklama">Konaklama</SelectItem>
                  <SelectItem value="Ulaşım">Ulaşım</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Bölge (slug)</Label>
              <Input value={bolge} onChange={(e) => setBolge(e.target.value)} placeholder="marmara" />
            </div>
            <div className="space-y-1">
              <Label>Tarih (başlangıç)</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tarih (bitiş)</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={fetchData} disabled={loading}>
              Filtrele
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setKategori("");
                setBolge("");
                setDateFrom("");
                setDateTo("");
                setTimeout(fetchData, 0);
              }}
              disabled={loading}
            >
              Sıfırla
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : !data || (data as any).error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Veri alınamadı.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500">Yakıt (₺/km)</div>
                <div className="text-lg font-semibold">{ort?.yakit_km ? formatCurrency(ort.yakit_km) : "—"}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500">Yemek (₺/kişi)</div>
                <div className="text-lg font-semibold">{ort?.yemek_kisi ? formatCurrency(ort.yemek_kisi) : "—"}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500">Konaklama (₺/gece)</div>
                <div className="text-lg font-semibold">{ort?.konaklama_gece ? formatCurrency(ort.konaklama_gece) : "—"}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500">Ulaşım (₺/birim)</div>
                <div className="text-lg font-semibold">{ort?.ulasim_birim ? formatCurrency(ort.ulasim_birim) : "—"}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-slate-900">Aylık Trend (ortalama birim maliyet)</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.aylik_trend}>
                    <XAxis dataKey="ay" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `₺${Number(v).toFixed(0)}`} />
                    <Tooltip formatter={(v: any) => (v == null ? ["—", ""] : [formatCurrency(Number(v)), ""]) } />
                    <Legend />
                    <Line type="monotone" dataKey="yakit_ort" name="Yakıt" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="yemek_ort" name="Yemek" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="konaklama_ort" name="Konaklama" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ulasim_ort" name="Ulaşım" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-slate-900">Kullanıcı Bazında Ortalamalar</h2>
                <div className="flex items-center gap-2">
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ort_birim">Ortalama Birim</SelectItem>
                      <SelectItem value="toplam">Toplam</SelectItem>
                      <SelectItem value="islem_sayisi">İşlem Sayısı</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortDir} onValueChange={(v) => setSortDir(v as any)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Azalan</SelectItem>
                      <SelectItem value="asc">Artan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-auto border rounded-lg">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2">Kullanıcı</th>
                      <th className="text-left px-3 py-2">Kategori</th>
                      <th className="text-right px-3 py-2">İşlem</th>
                      <th className="text-right px-3 py-2">Toplam</th>
                      <th className="text-right px-3 py-2">Ort. Birim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((r) => (
                      <tr key={`${r.user_id}-${r.kategori}`} className="border-t">
                        <td className="px-3 py-2">{r.ad}</td>
                        <td className="px-3 py-2">{r.kategori}</td>
                        <td className="px-3 py-2 text-right">{r.islem_sayisi}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(r.toplam)}</td>
                        <td className="px-3 py-2 text-right">{r.ort_birim ? formatCurrency(r.ort_birim) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">Anomali Uyarıları</h2>
              {data.anomaliler.length === 0 ? (
                <div className="text-sm text-slate-600">Anomali bulunamadı.</div>
              ) : (
                <div className="space-y-2">
                  {data.anomaliler.map((a) => (
                    <div
                      key={`${a.user_id}-${a.kategori}`}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                    >
                      ⚠️ {a.ad} — {a.kategori} — {formatCurrency(a.ort_birim)} (Sistem ortalaması:{" "}
                      {formatCurrency(a.sistem_ort)})
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

