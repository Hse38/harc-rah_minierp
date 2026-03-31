"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExpenseType } from "@/types";
import { formatCurrency } from "@/lib/utils";

export type KategoriDetay =
  | { km?: number | "" }
  | { kisi_sayisi?: number | "" }
  | { gece_sayisi?: number | "" }
  | { tip?: "km" | "bilet"; deger?: number | "" }
  | { aciklama?: string };

export type KategoriDetayErrors = Partial<Record<string, string>>;

function toNumber(input: unknown): number | null {
  if (input === "" || input == null) return null;
  const n = typeof input === "number" ? input : Number(String(input).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function unitCostText(category: ExpenseType, amount: number | null, value: KategoriDetay): string | null {
  if (!amount || amount <= 0) return null;

  if (category === "Yakıt") {
    const km = toNumber((value as { km?: unknown }).km);
    if (!km || km <= 0) return null;
    return `KM başına: ${formatCurrency(amount / km)}/km`;
  }
  if (category === "Yemek") {
    const kisi = toNumber((value as { kisi_sayisi?: unknown }).kisi_sayisi);
    if (!kisi || kisi <= 0) return null;
    return `Kişi başına: ${formatCurrency(amount / kisi)}/kişi`;
  }
  if (category === "Konaklama") {
    const gece = toNumber((value as { gece_sayisi?: unknown }).gece_sayisi);
    if (!gece || gece <= 0) return null;
    return `Gece başına: ${formatCurrency(amount / gece)}/gece`;
  }
  if (category === "Ulaşım") {
    const tip = (value as { tip?: "km" | "bilet" }).tip;
    const deger = toNumber((value as { deger?: unknown }).deger);
    if (!tip || !deger || deger <= 0) return null;
    return `${tip === "km" ? "KM" : "Bilet"} başına: ${formatCurrency(amount / deger)}/${tip}`;
  }

  return null;
}

export function KategoriEkAlanlari({
  category,
  amount,
  value,
  onChange,
  errors,
  disabled,
}: {
  category: ExpenseType;
  amount: number | null;
  value: KategoriDetay;
  onChange: (next: KategoriDetay) => void;
  errors?: KategoriDetayErrors;
  disabled?: boolean;
}) {
  const unitText = unitCostText(category, amount, value);

  if (!["Yakıt", "Yemek", "Konaklama", "Ulaşım", "Diğer"].includes(category)) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-slate-800">Ek Bilgiler</div>
        <div className="text-xs text-slate-500">Seçilen kategoriye göre zorunlu alanlar</div>
      </div>

      {category === "Yakıt" && (
        <div className="space-y-1.5">
          <Label htmlFor="kd_km">Kaç KM?</Label>
          <Input
            id="kd_km"
            type="number"
            inputMode="numeric"
            value={String((value as { km?: number | "" }).km ?? "")}
            onChange={(e) => onChange({ km: e.target.value === "" ? "" : Number(e.target.value) })}
            disabled={disabled}
          />
          {errors?.km && <p className="text-xs text-red-600">{errors.km}</p>}
          {unitText && <p className="text-xs italic text-slate-600">{unitText}</p>}
        </div>
      )}

      {category === "Yemek" && (
        <div className="space-y-1.5">
          <Label htmlFor="kd_kisi">Kaç kişi yendi?</Label>
          <Input
            id="kd_kisi"
            type="number"
            inputMode="numeric"
            value={String((value as { kisi_sayisi?: number | "" }).kisi_sayisi ?? "")}
            onChange={(e) =>
              onChange({ kisi_sayisi: e.target.value === "" ? "" : Number(e.target.value) })
            }
            disabled={disabled}
          />
          {errors?.kisi_sayisi && <p className="text-xs text-red-600">{errors.kisi_sayisi}</p>}
          {unitText && <p className="text-xs italic text-slate-600">{unitText}</p>}
        </div>
      )}

      {category === "Konaklama" && (
        <div className="space-y-1.5">
          <Label htmlFor="kd_gece">Kaç gece?</Label>
          <Input
            id="kd_gece"
            type="number"
            inputMode="numeric"
            value={String((value as { gece_sayisi?: number | "" }).gece_sayisi ?? "")}
            onChange={(e) =>
              onChange({ gece_sayisi: e.target.value === "" ? "" : Number(e.target.value) })
            }
            disabled={disabled}
          />
          {errors?.gece_sayisi && <p className="text-xs text-red-600">{errors.gece_sayisi}</p>}
          {unitText && <p className="text-xs italic text-slate-600">{unitText}</p>}
        </div>
      )}

      {category === "Ulaşım" && (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label>KM mi / Bilet adedi mi?</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="kd_tip"
                  value="km"
                  checked={(value as { tip?: "km" | "bilet" }).tip === "km"}
                  onChange={() => onChange({ ...(value as object), tip: "km" } as KategoriDetay)}
                  disabled={disabled}
                />
                KM
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="kd_tip"
                  value="bilet"
                  checked={(value as { tip?: "km" | "bilet" }).tip === "bilet"}
                  onChange={() => onChange({ ...(value as object), tip: "bilet" } as KategoriDetay)}
                  disabled={disabled}
                />
                Bilet
              </label>
            </div>
            {errors?.tip && <p className="text-xs text-red-600">{errors.tip}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kd_deger">Sayı</Label>
            <Input
              id="kd_deger"
              type="number"
              inputMode="numeric"
              value={String((value as { deger?: number | "" }).deger ?? "")}
              onChange={(e) =>
                onChange({ ...(value as object), deger: e.target.value === "" ? "" : Number(e.target.value) } as KategoriDetay)
              }
              disabled={disabled}
            />
            {errors?.deger && <p className="text-xs text-red-600">{errors.deger}</p>}
            {unitText && <p className="text-xs italic text-slate-600">{unitText}</p>}
          </div>
        </div>
      )}

      {category === "Diğer" && (
        <div className="space-y-1.5">
          <Label htmlFor="kd_aciklama">Açıklama notu (Ne için?)</Label>
          <Textarea
            id="kd_aciklama"
            value={String((value as { aciklama?: string }).aciklama ?? "")}
            onChange={(e) => onChange({ aciklama: e.target.value })}
            rows={2}
            disabled={disabled}
          />
          {errors?.aciklama && <p className="text-xs text-red-600">{errors.aciklama}</p>}
        </div>
      )}
    </div>
  );
}

