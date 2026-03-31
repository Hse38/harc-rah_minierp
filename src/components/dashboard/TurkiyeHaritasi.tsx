"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** SVG path name (from turkey.svg) -> bölge slug */
const IL_BOLGE_MAP: Record<string, string> = {
  Adana: "akdeniz",
  Adıyaman: "guneydogu",
  Afyonkarahisar: "ege",
  Agri: "dogu_anadolu",
  Ağrı: "dogu_anadolu",
  Aksaray: "ic_anadolu",
  Amasya: "karadeniz",
  Ankara: "ic_anadolu",
  Antalya: "akdeniz",
  Ardahan: "dogu_anadolu",
  Artvin: "karadeniz",
  Aydin: "ege",
  Aydın: "ege",
  Balikesir: "marmara",
  Balıkesir: "marmara",
  Bartın: "karadeniz",
  Batman: "guneydogu",
  Bayburt: "karadeniz",
  Bilecik: "marmara",
  Bingöl: "dogu_anadolu",
  Bitlis: "dogu_anadolu",
  Bolu: "karadeniz",
  Burdur: "akdeniz",
  Bursa: "marmara",
  Çanakkale: "marmara",
  Çankırı: "ic_anadolu",
  Denizli: "ege",
  Diyarbakir: "guneydogu",
  Diyarbakır: "guneydogu",
  Düzce: "karadeniz",
  Edirne: "marmara",
  Elazig: "dogu_anadolu",
  Elazığ: "dogu_anadolu",
  Erzincan: "dogu_anadolu",
  Erzurum: "dogu_anadolu",
  Eskisehir: "ic_anadolu",
  Eskişehir: "ic_anadolu",
  Gaziantep: "guneydogu",
  Giresun: "karadeniz",
  Gümüşhane: "karadeniz",
  Hakkari: "dogu_anadolu",
  Hatay: "akdeniz",
  Iğdir: "dogu_anadolu",
  Isparta: "akdeniz",
  Istanbul: "marmara",
  İstanbul: "marmara",
  Izmir: "ege",
  İzmir: "ege",
  "K. Maras": "akdeniz",
  Kahramanmaraş: "akdeniz",
  Karabük: "karadeniz",
  Karaman: "ic_anadolu",
  Kars: "dogu_anadolu",
  Kastamonu: "karadeniz",
  Kayseri: "ic_anadolu",
  Kilis: "guneydogu",
  Kinkkale: "ic_anadolu",
  Kırıkkale: "ic_anadolu",
  Kırklareli: "marmara",
  Kirklareli: "marmara",
  Kırşehir: "ic_anadolu",
  Kocaeli: "marmara",
  Konya: "ic_anadolu",
  Kütahya: "ege",
  Malatya: "dogu_anadolu",
  Manisa: "ege",
  Mardin: "guneydogu",
  Mersin: "akdeniz",
  Mugla: "ege",
  Muğla: "ege",
  Mus: "dogu_anadolu",
  Muş: "dogu_anadolu",
  Nevşehir: "ic_anadolu",
  Niğde: "ic_anadolu",
  Nigde: "ic_anadolu",
  Ordu: "karadeniz",
  Osmaniye: "akdeniz",
  Rize: "karadeniz",
  Sakarya: "marmara",
  Samsun: "karadeniz",
  Sanliurfa: "guneydogu",
  Şanlıurfa: "guneydogu",
  Siirt: "guneydogu",
  Sinop: "karadeniz",
  Sirnak: "guneydogu",
  Şırnak: "guneydogu",
  Sivas: "ic_anadolu",
  Tekirdag: "marmara",
  Tekirdağ: "marmara",
  Tokat: "karadeniz",
  Trabzon: "karadeniz",
  Tunceli: "dogu_anadolu",
  Usak: "ege",
  Uşak: "ege",
  Van: "dogu_anadolu",
  Yalova: "marmara",
  Yozgat: "ic_anadolu",
  Zinguldak: "karadeniz",
  Zonguldak: "karadeniz",
  Çorum: "karadeniz",
};

/** Haritadaki 81 il – SVG path name (tıklanınca gelen). Bölge sorumlusu ve il verisi hep bu anahtarlarla. */
const CANONICAL_IL_KEYS: string[] = [
  "Adana", "Adiyaman", "Afyonkarahisar", "Agri", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
  "Aydin", "Balikesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
  "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakir", "Düzce", "Edirne", "Elazig", "Erzincan", "Erzurum",
  "Eskisehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdir", "Isparta", "Istanbul", "Izmir",
  "K. Maras", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kinkkale", "Kirklareli", "Kirsehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Mugla", "Mus", "Nevsehir", "Nigde",
  "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Sanliurfa", "Siirt", "Sinop", "Sirnak", "Sivas", "Tekirdag",
  "Tokat", "Trabzon", "Tunceli", "Usak", "Van", "Yalova", "Yozgat", "Zinguldak",
];

const BOLGE_RENKLER: Record<string, string> = {
  marmara: "#B5D4F4",
  ege: "#9FE1CB",
  ic_anadolu: "#FAC775",
  karadeniz: "#F5C4B3",
  dogu_anadolu: "#CECBF6",
  guneydogu: "#F4C0D1",
  akdeniz: "#C0DD97",
};

const BOLGE_ADLARI: Record<string, string> = {
  marmara: "Marmara Bölgesi",
  ege: "Ege Bölgesi",
  ic_anadolu: "İç Anadolu Bölgesi",
  karadeniz: "Karadeniz Bölgesi",
  dogu_anadolu: "Doğu Anadolu Bölgesi",
  guneydogu: "Güneydoğu Anadolu Bölgesi",
  akdeniz: "Akdeniz Bölgesi",
};

/** DB'deki il adı (Türkçe) -> SVG path name (harita tıklanınca gelen) */
const EXPENSE_IL_TO_SVG: Record<string, string> = {
  İstanbul: "Istanbul",
  Tekirdağ: "Tekirdag",
  Kırklareli: "Kirklareli",
  Zonguldak: "Zinguldak",
  Şanlıurfa: "Sanliurfa",
  Şırnak: "Sirnak",
  İzmir: "Izmir",
  Ağrı: "Agri",
  Iğdır: "Iğdir",
  Kahramanmaraş: "K. Maras",
  Kırıkkale: "Kinkkale",
  Çankırı: "Çankırı",
  Karabük: "Karabük",
  Kütahya: "Kütahya",
  Bingöl: "Bingöl",
  Gümüşhane: "Gümüşhane",
  Niğde: "Nigde",
  Uşak: "Usak",
  Elazığ: "Elazig",
  Diyarbakır: "Diyarbakir",
  Muğla: "Mugla",
  Eskişehir: "Eskisehir",
  Adıyaman: "Adiyaman",
  Nevşehir: "Nevsehir",
  Kırşehir: "Kirsehir",
  Balıkesir: "Balikesir",
  Aydın: "Aydin",
};

/** expense.il (DB) veya profile.il → harita anahtarı (SVG path name). Büyük/küçük harf duyarsız. */
function ilToKey(il: string | null): string {
  if (!il) return "";
  const t = il.trim();
  if (!t) return "";
  const fromMap = EXPENSE_IL_TO_SVG[t];
  if (fromMap) return fromMap;
  const lower = t.toLocaleLowerCase("tr-TR");
  for (const c of CANONICAL_IL_KEYS) {
    if (c.toLocaleLowerCase("tr-TR") === lower) return c;
  }
  return t;
}

/** İl eşleştirmesi: büyük/küçük harf duyarsız (profiles.il vs harita il adı). */
function ilMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return false;
  return a.trim().toLocaleLowerCase("tr-TR") === b.trim().toLocaleLowerCase("tr-TR");
}

/** Seçilen il adına karşılık gelen IL_BOLGE_MAP anahtarını bulur (case-insensitive). */
function getBolgeForIl(ilName: string | null): string | null {
  if (!ilName) return null;
  const key = Object.keys(IL_BOLGE_MAP).find((k) => ilMatches(k, ilName));
  return key ? IL_BOLGE_MAP[key] : null;
}

/** Seçilen il için ilData anahtarını bulur (case-insensitive). */
function getIlDataKey(selectedIl: string | null): string | null {
  if (!selectedIl) return null;
  const found = CANONICAL_IL_KEYS.find((k) => ilMatches(k, selectedIl));
  return found ?? null;
}

/** Canonical il key -> bölge slug (case-insensitive IL_BOLGE_MAP lookup) */
function getBolgeForIlKey(ilKey: string): string | null {
  const mapKey = Object.keys(IL_BOLGE_MAP).find((k) => ilMatches(k, ilKey));
  return mapKey ? IL_BOLGE_MAP[mapKey] : null;
}

interface IlData {
  total: number;
  count: number;
  pending: number;
  bolge_sorumlusu: string;
  persons: { name: string; amount: number; status: string }[];
}

type ProfileRow = { id: string; full_name: string | null; il: string | null; role: string | null; bolge: string | null };
type ExpenseRow = { il?: string; amount?: number; status?: string; submitter_id?: string };

export default function TurkiyeHaritasi() {
  const [svgContent, setSvgContent] = useState("");
  const [selectedIl, setSelectedIl] = useState<string | null>(null);
  const [selectedBolgeKey, setSelectedBolgeKey] = useState<string | null>(null);
  const [ilData, setIlData] = useState<Record<string, IlData>>({});
  const supabase = createClient();

  useEffect(() => {
    fetch("/turkey.svg")
      .then((r) => r.text())
      .then((svg) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, "image/svg+xml");
        const paths = doc.querySelectorAll("path");
        paths.forEach((path) => {
          const name = path.getAttribute("name");
          if (!name) return;
          const bolge = IL_BOLGE_MAP[name];
          const renk = bolge ? BOLGE_RENKLER[bolge] : "#E5E7EB";
          path.setAttribute("fill", renk);
          path.setAttribute("stroke", "#ffffff");
          path.setAttribute("stroke-width", "0.5");
          path.style.cursor = "pointer";
          path.style.transition = "opacity 0.15s";
          path.setAttribute("data-il", name);
          path.setAttribute("data-bolge", bolge || "");
        });
        const serializer = new XMLSerializer();
        setSvgContent(serializer.serializeToString(doc.documentElement));
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, il, role, bolge");
      const { data: expenses } = await supabase
        .from("expenses")
        .select("il, amount, status, submitter_id");
      if (cancelled) return;
      const profileList = (profiles ?? []) as ProfileRow[];
      const expenseList = (expenses ?? []) as ExpenseRow[];
      const profileById = new Map(profileList.map((p) => [p.id, p]));

      const grouped: Record<string, IlData> = {};
      CANONICAL_IL_KEYS.forEach((il) => {
        grouped[il] = { total: 0, count: 0, pending: 0, bolge_sorumlusu: "", persons: [] };
      });

      // 4. Harcama verileri: submitter'ın il'i (profiles.il) üzerinden – JOIN mantığı
      expenseList.forEach((e) => {
        const profile = e.submitter_id ? profileById.get(e.submitter_id) : null;
        const submitterIl = profile?.il ?? null;
        const key = ilToKey(submitterIl);
        if (!key || !grouped[key]) return;
        grouped[key].total += Number(e.amount) || 0;
        grouped[key].count++;
        if (e.status === "pending_bolge" || e.status === "pending_koord") {
          grouped[key].pending++;
        }
      });

      // 2. Bölge sorumlusu: il değil bolge üzerinden – her bölge için role=bolge olan profil
      const bolgeSet = new Set<string>(Object.values(IL_BOLGE_MAP));
      for (const bolge of bolgeSet) {
        const { data: bs } = await supabase
          .from("profiles")
          .select("full_name, bolge")
          .eq("role", "bolge")
          .eq("bolge", bolge)
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (bs && (bs as { full_name?: string }).full_name) {
          const fullName = (bs as { full_name: string }).full_name;
          Object.entries(IL_BOLGE_MAP).forEach(([il, b]) => {
            if (b === bolge && grouped[il]) {
              grouped[il].bolge_sorumlusu = fullName;
            }
          });
        }
      }

      // 3. Personel listesi: profiles'dan il eşleşenleri (case-insensitive), sonra harcama toplamları
      CANONICAL_IL_KEYS.forEach((ilKey) => {
        const personsInIl = profileList.filter((p) => ilMatches(p.il, ilKey));
        const personRows = personsInIl.map((p) => {
          let amount = 0;
          let status = "";
          expenseList.forEach((e) => {
            if (e.submitter_id !== p.id) return;
            const subIl = profileById.get(e.submitter_id)?.il;
            if (!ilMatches(subIl, ilKey)) return;
            amount += Number(e.amount) || 0;
            if (e.status) status = e.status;
          });
          return {
            name: p.full_name || "İsimsiz",
            amount,
            status,
          };
        });
        grouped[ilKey].persons = personRows;
      });

      setIlData(grouped);
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSvgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGPathElement;
    const il = target.getAttribute("data-il");
    if (il) {
      setSelectedBolgeKey(null);
      setSelectedIl(il);
      const svgEl = e.currentTarget.querySelector("svg");
      if (svgEl) {
        svgEl.querySelectorAll("path").forEach((p) => {
          (p as SVGPathElement).style.opacity = "1";
          p.setAttribute("stroke-width", "0.5");
          p.setAttribute("stroke", "#ffffff");
        });
        target.style.opacity = "0.75";
        target.setAttribute("stroke-width", "2");
        target.setAttribute("stroke", "#1E2761");
      }
    }
  };

  const selectedBolge = selectedIl ? getBolgeForIl(selectedIl) : null;
  const ilDataKey = getIlDataKey(selectedIl);
  const dataForSelected = ilDataKey ? ilData[ilDataKey] : null;

  const regionAggregate = useMemo(() => {
    if (!selectedBolgeKey) return null;
    const keysInRegion = CANONICAL_IL_KEYS.filter((k) => getBolgeForIlKey(k) === selectedBolgeKey);
    let total = 0;
    let count = 0;
    let pending = 0;
    let bolge_sorumlusu = "";
    keysInRegion.forEach((k) => {
      const d = ilData[k];
      if (!d) return;
      total += Number(d.total) || 0;
      count += Number(d.count) || 0;
      pending += Number(d.pending) || 0;
      if (!bolge_sorumlusu && d.bolge_sorumlusu) bolge_sorumlusu = d.bolge_sorumlusu;
    });
    const name = BOLGE_ADLARI[selectedBolgeKey]?.replace(" Bölgesi", "") ?? selectedBolgeKey;
    return { name, total, count, pending, bolge_sorumlusu: bolge_sorumlusu || "Atanmamış" };
  }, [ilData, selectedBolgeKey]);

  const statusLabel: Record<string, string> = {
    pending_bolge: "Bekliyor",
    pending_koord: "Bekliyor",
    approved_bolge: "Onaylandı",
    approved_koord: "Onaylandı",
    rejected_bolge: "Reddedildi",
    rejected_koord: "Reddedildi",
    paid: "Ödendi",
  };
  const statusColor: Record<string, string> = {
    Bekliyor: "bg-amber-100 text-amber-800",
    Onaylandı: "bg-green-100 text-green-800",
    Reddedildi: "bg-red-100 text-red-800",
    Ödendi: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {Object.entries(BOLGE_ADLARI).map(([key, ad]) => (
          <div
            key={key}
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedIl(null);
              setSelectedBolgeKey(key);
            }}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                setSelectedIl(null);
                setSelectedBolgeKey(key);
              }
            }}
            className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 select-none cursor-pointer transition-colors ${
              selectedBolgeKey === key
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: BOLGE_RENKLER[key] }} />
            <span>{ad.replace(" Bölgesi", "")}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <div
          className="flex-1 min-h-[300px] [&_svg]:max-h-[400px] [&_svg]:w-full [&_svg]:h-auto"
          onClick={handleSvgClick}
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ minHeight: 300 }}
        />
        <div className="lg:w-80 shrink-0">
          {!selectedIl && !selectedBolgeKey ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center text-sm text-gray-400 border border-gray-100">
              İl seçmek için haritaya tıklayın
            </div>
          ) : selectedIl ? (
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedIl}</h3>
                  <p className="text-xs text-gray-400">
                    {selectedBolge ? BOLGE_ADLARI[selectedBolge] : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIl(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Toplam</p>
                  <p className="text-base font-semibold text-gray-900">
                    {dataForSelected ? `₺${dataForSelected.total.toLocaleString("tr-TR")}` : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Harcama</p>
                  <p className="text-base font-semibold text-gray-900">
                    {dataForSelected ? dataForSelected.count : "0"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Bekleyen</p>
                  <p className="text-base font-semibold text-amber-600">
                    {dataForSelected ? dataForSelected.pending : "0"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Bölge Sorumlusu</p>
                <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-xs font-semibold text-blue-800 shrink-0">
                    {dataForSelected?.bolge_sorumlusu
                      ? dataForSelected.bolge_sorumlusu
                          .split(" ")
                          .map((w: string) => w[0])
                          .join("")
                          .slice(0, 2)
                      : "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {dataForSelected?.bolge_sorumlusu || "Atanmamış"}
                    </p>
                    <p className="text-xs text-gray-400">Bölge Sorumlusu</p>
                  </div>
                </div>
              </div>
              {dataForSelected && dataForSelected.persons.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2">Personel Harcamaları</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {dataForSelected.persons
                      .sort((a, b) => b.amount - a.amount)
                      .map((p, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center py-1.5 border-t border-gray-50 gap-2"
                        >
                          <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-sm font-semibold text-blue-600">
                              ₺{p.amount.toLocaleString("tr-TR")}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor[statusLabel[p.status]] || "bg-gray-100 text-gray-600"}`}
                            >
                              {statusLabel[p.status] || p.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">Bu il için henüz harcama yok</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{regionAggregate?.name ?? "—"}</h3>
                  <p className="text-xs text-gray-400">Bölge Özeti</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBolgeKey(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Toplam</p>
                  <p className="text-base font-semibold text-gray-900">
                    {regionAggregate ? `₺${regionAggregate.total.toLocaleString("tr-TR")}` : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Harcama</p>
                  <p className="text-base font-semibold text-gray-900">
                    {regionAggregate ? regionAggregate.count : "0"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Bekleyen</p>
                  <p className="text-base font-semibold text-amber-600">
                    {regionAggregate ? regionAggregate.pending : "0"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Bölge Sorumlusu</p>
                <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-xs font-semibold text-blue-800 shrink-0">
                    {regionAggregate?.bolge_sorumlusu
                      ? regionAggregate.bolge_sorumlusu
                          .split(" ")
                          .map((w: string) => w[0])
                          .join("")
                          .slice(0, 2)
                      : "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {regionAggregate?.bolge_sorumlusu || "Atanmamış"}
                    </p>
                    <p className="text-xs text-gray-400">Bölge Sorumlusu</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
