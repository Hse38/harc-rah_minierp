import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type StatCategory = "Yakıt" | "Yemek" | "Konaklama" | "Ulaşım";

type ExpenseRow = {
  submitter_id: string;
  submitter_name: string;
  bolge: string | null;
  expense_type: string;
  amount: number;
  created_at: string;
  kategori_detay: unknown | null;
};

function ymKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function extractUnit(exp: ExpenseRow): { category: StatCategory; unit: number; unitLabel: string } | null {
  const kd = exp.kategori_detay as any;
  if (!kd || typeof kd !== "object") return null;

  if (exp.expense_type === "Yakıt") {
    const km = Number(kd.km);
    if (!Number.isFinite(km) || km <= 0) return null;
    return { category: "Yakıt", unit: km, unitLabel: "km" };
  }
  if (exp.expense_type === "Yemek") {
    const kisi = Number(kd.kisi_sayisi);
    if (!Number.isFinite(kisi) || kisi <= 0) return null;
    return { category: "Yemek", unit: kisi, unitLabel: "kişi" };
  }
  if (exp.expense_type === "Konaklama") {
    const gece = Number(kd.gece_sayisi);
    if (!Number.isFinite(gece) || gece <= 0) return null;
    return { category: "Konaklama", unit: gece, unitLabel: "gece" };
  }
  if (exp.expense_type === "Ulaşım") {
    const tip = kd.tip === "km" || kd.tip === "bilet" ? (kd.tip as "km" | "bilet") : null;
    const deger = Number(kd.deger);
    if (!tip || !Number.isFinite(deger) || deger <= 0) return null;
    return { category: "Ulaşım", unit: deger, unitLabel: tip };
  }
  return null;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role;
  if (!role || !["koordinator", "yk", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const kategori = url.searchParams.get("kategori") ?? "";
  const bolge = url.searchParams.get("bolge") ?? "";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";

  // use admin client to avoid RLS issues on cross-region stats
  const admin = createAdminClient();
  let q = admin
    .from("expenses")
    .select("submitter_id,submitter_name,bolge,expense_type,amount,created_at,kategori_detay")
    .in("status", ["approved_koord", "paid"])
    .not("kategori_detay", "is", null)
    .limit(5000);
  if (kategori) q = q.eq("expense_type", kategori);
  if (bolge) q = q.eq("bolge", bolge);
  if (dateFrom) q = q.gte("created_at", dateFrom);
  if (dateTo) q = q.lte("created_at", dateTo + "T23:59:59.999Z");

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as ExpenseRow[];

  const systemUnitCosts: Record<StatCategory, number[]> = {
    Yakıt: [],
    Yemek: [],
    Konaklama: [],
    Ulaşım: [],
  };

  const byUserCat = new Map<string, { user_id: string; ad: string; kategori: StatCategory; islem_sayisi: number; toplam: number; unitCosts: number[] }>();
  const byMonthCat = new Map<string, Record<StatCategory, number[]>>();

  for (const r of rows) {
    const info = extractUnit(r);
    if (!info) continue;
    const unitCost = r.amount / info.unit;
    if (!Number.isFinite(unitCost) || unitCost <= 0) continue;

    systemUnitCosts[info.category].push(unitCost);

    const key = `${r.submitter_id}__${info.category}`;
    const cur = byUserCat.get(key) ?? {
      user_id: r.submitter_id,
      ad: r.submitter_name,
      kategori: info.category,
      islem_sayisi: 0,
      toplam: 0,
      unitCosts: [],
    };
    cur.islem_sayisi += 1;
    cur.toplam += r.amount;
    cur.unitCosts.push(unitCost);
    byUserCat.set(key, cur);

    const monthKey = ymKey(new Date(r.created_at));
    const monthBucket = byMonthCat.get(monthKey) ?? { Yakıt: [], Yemek: [], Konaklama: [], Ulaşım: [] };
    monthBucket[info.category].push(unitCost);
    byMonthCat.set(monthKey, monthBucket);
  }

  const sistem_ortalamalar = {
    yakit_km: avg(systemUnitCosts["Yakıt"]),
    yemek_kisi: avg(systemUnitCosts["Yemek"]),
    konaklama_gece: avg(systemUnitCosts["Konaklama"]),
    ulasim_birim: avg(systemUnitCosts["Ulaşım"]),
  };

  const kullanici_bazli = Array.from(byUserCat.values()).map((r) => ({
    user_id: r.user_id,
    ad: r.ad,
    kategori: r.kategori,
    islem_sayisi: r.islem_sayisi,
    toplam: r.toplam,
    ort_birim: avg(r.unitCosts),
  }));

  const aylik_trend = Array.from(byMonthCat.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ay, v]) => ({
      ay,
      yakit_ort: avg(v["Yakıt"]),
      yemek_ort: avg(v["Yemek"]),
      konaklama_ort: avg(v["Konaklama"]),
      ulasim_ort: avg(v["Ulaşım"]),
    }));

  const anomaliler = kullanici_bazli
    .map((r) => {
      const sys =
        r.kategori === "Yakıt"
          ? sistem_ortalamalar.yakit_km
          : r.kategori === "Yemek"
            ? sistem_ortalamalar.yemek_kisi
            : r.kategori === "Konaklama"
              ? sistem_ortalamalar.konaklama_gece
              : sistem_ortalamalar.ulasim_birim;
      if (!sys || !r.ort_birim) return null;
      if (r.ort_birim > 2 * sys) {
        return {
          user_id: r.user_id,
          ad: r.ad,
          kategori: r.kategori,
          ort_birim: r.ort_birim,
          sistem_ort: sys,
        };
      }
      return null;
    })
    .filter(Boolean);

  return NextResponse.json({
    sistem_ortalamalar,
    kullanici_bazli,
    aylik_trend,
    anomaliler,
  });
}

