/** Bölge slug (DB/API) → Türkçe görüntü adı */
export const REGION_SLUG_TO_TR: Record<string, string> = {
  marmara: "Marmara",
  ege: "Ege",
  karadeniz: "Karadeniz",
  ic_anadolu: "İç Anadolu",
  "iç anadolu": "İç Anadolu",
  akdeniz: "Akdeniz",
  dogu_anadolu: "Doğu Anadolu",
  "doğu anadolu": "Doğu Anadolu",
  guneydogu: "Güneydoğu Anadolu",
  "güneydoğu anadolu": "Güneydoğu Anadolu",
  "guneydogu anadolu": "Güneydoğu Anadolu",
};

/** Koordinatör limitler sekmesinde kullanılan 7 bölge (slug) */
export const REGION_LIMIT_SLUGS = [
  "marmara",
  "ege",
  "karadeniz",
  "ic_anadolu",
  "akdeniz",
  "dogu_anadolu",
  "guneydogu",
] as const;

export type RegionLimitSlug = (typeof REGION_LIMIT_SLUGS)[number];

/** Türkçe bölge adı → slug (region_limits.region) */
const TR_TO_SLUG: Record<string, string> = {};
Object.entries(REGION_SLUG_TO_TR).forEach(([slug, tr]) => {
  TR_TO_SLUG[tr.toLowerCase()] = slug;
  TR_TO_SLUG[slug] = slug;
});

/** Slug veya serbest metni Türkçe bölge adına çevirir */
export function regionToTurkish(bolge: string | null | undefined): string {
  if (!bolge) return "Belirsiz";
  const key = bolge.toLowerCase().replace(/\s/g, "_").replace("ı", "i").replace("ö", "o").replace("ü", "u").replace("ç", "c").replace("ğ", "g");
  if (REGION_SLUG_TO_TR[key]) return REGION_SLUG_TO_TR[key];
  if (REGION_SLUG_TO_TR[bolge.toLowerCase()]) return REGION_SLUG_TO_TR[bolge.toLowerCase()];
  return bolge;
}

/** Bölge adı (Türkçe veya slug) → slug */
export function regionToSlug(bolge: string | null | undefined): string | null {
  if (!bolge) return null;
  const lower = bolge.toLowerCase().trim();
  const normalized = lower.replace(/\s/g, "_").replace("ı", "i").replace("ö", "o").replace("ü", "u").replace("ç", "c").replace("ğ", "g");
  if (REGION_LIMIT_SLUGS.includes(normalized as RegionLimitSlug)) return normalized;
  const tr = regionToTurkish(bolge);
  return TR_TO_SLUG[tr.toLowerCase()] ?? null;
}
