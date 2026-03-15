import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);

export const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));

export const formatDateLong = (dateStr: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));

/** Bölge slug → Türkçe görüntü adı (tüm sayfalarda kullan) */
export function bolgeAdi(bolge: string | null | undefined): string {
  if (!bolge) return "";
  const map: Record<string, string> = {
    ic_anadolu: "İç Anadolu",
    dogu_anadolu: "Doğu Anadolu",
    guneydogu: "Güneydoğu Anadolu",
    marmara: "Marmara",
    ege: "Ege",
    karadeniz: "Karadeniz",
    akdeniz: "Akdeniz",
  };
  const key = bolge.toLowerCase().trim().replace(/\s/g, "_");
  return map[key] ?? bolge;
}
