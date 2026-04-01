"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReceiptUploader } from "@/components/expenses/receipt-uploader";
import { AiAnalysisBox } from "@/components/expenses/ai-analysis-box";
import type { ExpenseType } from "@/types";
import type { ReceiptAnalysis } from "@/types";
import type { Profile } from "@/types";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { notifyApi } from "@/lib/notify-api";
import { PROFILE_FIELDS_FORM } from "@/lib/expense-fields";
import { formatCurrency } from "@/lib/utils";
import {
  getUserFriendlyErrorMessage,
  getUserFriendlyApiErrorMessage,
  getDevErrorText,
  logRawError,
} from "@/lib/errorMessages";
import {
  KategoriEkAlanlari,
  type KategoriDetay,
  type KategoriDetayErrors,
} from "@/components/KategoriEkAlanlari";

const EXPENSE_TYPES: ExpenseType[] = [
  "Yakıt",
  "Ulaşım",
  "Konaklama",
  "Yemek",
  "Malzeme",
  "Diğer",
];

export default function DeneyapYeniPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fisHash, setFisHash] = useState("");
  const [manuelGiris, setManuelGiris] = useState(false);
  const [aiSnapshot, setAiSnapshot] = useState<{
    amount: string;
    expense_type: ExpenseType;
    description: string;
  } | null>(null);
  const [oldReceiptNeedsConfirm, setOldReceiptNeedsConfirm] = useState(false);
  const [oldReceiptConfirmed, setOldReceiptConfirmed] = useState(false);
  const [vekaletIller, setVekaletIller] = useState<string[]>([]);
  const [selectedIl, setSelectedIl] = useState<string>("");
  const [form, setForm] = useState({
    iban: "",
    expense_type: "Diğer" as ExpenseType,
    amount: "",
    description: "",
  });
  const [kategoriDetay, setKategoriDetay] = useState<KategoriDetay>({});
  const [kategoriDetayErrors, setKategoriDetayErrors] =
    useState<KategoriDetayErrors>({});
  const [lastTemplate, setLastTemplate] = useState<{
    expense_type: ExpenseType;
    amount: number;
    description: string | null;
    kategori_detay: unknown | null;
  } | null>(null);
  const [templateDismissed, setTemplateDismissed] = useState(false);
  const [draftBanner, setDraftBanner] = useState<"hidden" | "visible">("visible");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoadedOnce, setDraftLoadedOnce] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select(PROFILE_FIELDS_FORM)
        .eq("id", user.id)
        .single();
      const pr = p as Profile | null;
      setProfile(pr ?? null);
      setSelectedIl(pr?.il ?? "");
      setForm((f) => ({
        ...f,
        iban: pr?.iban ?? "",
      }));
      if (pr?.id) {
        const { data: vekalet } = await supabase
          .from("vekalet_atamalari")
          .select("asil_il")
          .eq("vekil_user_id", pr.id);
        const list = ((vekalet ?? []) as { asil_il?: string }[])
          .map((r) => String(r.asil_il ?? "").trim())
          .filter(Boolean);
        setVekaletIller(Array.from(new Set(list)));
      }

      // Quick template: most recent expense
      if (pr?.id) {
        const { data: last } = await supabase
          .from("expenses")
          .select("expense_type, amount, description, kategori_detay")
          .eq("submitter_id", pr.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const row = last as
          | { expense_type?: ExpenseType; amount?: number; description?: string | null; kategori_detay?: unknown | null }
          | null;
        if (row?.expense_type && typeof row.amount === "number") {
          setLastTemplate({
            expense_type: row.expense_type,
            amount: row.amount,
            description: row.description ?? "",
            kategori_detay: row.kategori_detay ?? null,
          });
        }
      }

      // Draft: load if exists
      if (pr?.id) {
        const { data: draft } = await supabase
          .from("expense_drafts")
          .select("id, form_data")
          .eq("user_id", pr.id)
          .maybeSingle();
        const d = draft as { id?: string; form_data?: any } | null;
        if (d?.id && d?.form_data) {
          setDraftId(String(d.id));
        }
      }
      setLoading(false);
    })();
  }, [supabase, router]);

  async function saveDraft(silent: boolean) {
    if (!profile?.id) return;
    const payload = {
      iban: form.iban ?? "",
      expense_type: form.expense_type,
      amount: form.amount ?? "",
      description: form.description ?? "",
      il: selectedIl ?? profile.il ?? null,
      kategori_detay: kategoriDetay ?? {},
    };
    const { error } = await supabase.from("expense_drafts").upsert(
      {
        user_id: profile.id,
        form_data: payload,
      },
      { onConflict: "user_id" }
    );
    if (!error && !silent) toast.success("Taslak kaydedildi");
  }

  async function deleteDraft() {
    if (!profile?.id) return;
    await supabase.from("expense_drafts").delete().eq("user_id", profile.id);
    setDraftId(null);
    setDraftBanner("hidden");
  }

  async function loadDraft() {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("expense_drafts")
      .select("form_data")
      .eq("user_id", profile.id)
      .maybeSingle();
    const fd = (data as { form_data?: any } | null)?.form_data;
    if (!fd) return;
    setForm((f) => ({
      ...f,
      iban: String(fd.iban ?? f.iban ?? ""),
      expense_type: (fd.expense_type as ExpenseType) ?? f.expense_type,
      amount: String(fd.amount ?? ""),
      description: String(fd.description ?? ""),
    }));
    if (fd.il) setSelectedIl(String(fd.il));
    setKategoriDetay((fd.kategori_detay && typeof fd.kategori_detay === "object" ? fd.kategori_detay : {}) as KategoriDetay);
    setDraftLoadedOnce(true);
    setDraftBanner("hidden");
  }

  // autosave every 30s (silent)
  useEffect(() => {
    if (!profile?.id) return;
    const t = window.setInterval(() => {
      void saveDraft(true);
    }, 30000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, form, kategoriDetay, selectedIl]);

  function parseReceiptDate(input?: string): Date | null {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;
    const iso = Date.parse(s);
    if (!Number.isNaN(iso)) return new Date(iso);
    const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (m) {
      const d = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const y = parseInt(m[3], 10);
      const dt = new Date(y, mo, d);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
    return null;
  }

  function isOlderThanDays(date: Date, days: number): boolean {
    const diffMs = Date.now() - date.getTime();
    return diffMs > days * 24 * 60 * 60 * 1000;
  }

  function handleAnalysisResult(data: ReceiptAnalysis | null) {
    setAnalysis(data);
    setAnalyzing(false);
    setFisHash(data?.fis_hash ?? "");
    setManuelGiris(false);
    setOldReceiptConfirmed(false);
    if (data && !data.error) {
      const nextAmount = data.tutar != null ? String(data.tutar) : form.amount;
      const nextType = (data.kategori ?? form.expense_type) as ExpenseType;
      const nextDesc = data.aciklama != null ? String(data.aciklama) : form.description;
      setForm((f) => ({
        ...f,
        amount: nextAmount,
        expense_type: nextType,
        description: nextDesc,
      }));
      setAiSnapshot({ amount: nextAmount, expense_type: nextType, description: nextDesc });
      setKategoriDetayErrors({});
      if (nextType === "Yakıt") setKategoriDetay({ km: "" });
      else if (nextType === "Yemek") setKategoriDetay({ kisi_sayisi: "" });
      else if (nextType === "Konaklama") setKategoriDetay({ gece_sayisi: "" });
      else if (nextType === "Ulaşım") setKategoriDetay({ tip: "km", deger: "" });
      else if (nextType === "Diğer") setKategoriDetay({ aciklama: "" });
      else setKategoriDetay({});

      const dt = parseReceiptDate(data.tarih);
      const isOld = dt ? isOlderThanDays(dt, 60) : false;
      setOldReceiptNeedsConfirm(isOld);
    } else {
      setAiSnapshot(null);
      setOldReceiptNeedsConfirm(false);
    }
  }

  function isDuplicateExpenseNumberError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const e = err as { code?: string; message?: string; details?: string };
    if (e.code === "23505") return true;
    const msg = String(e.message ?? e.details ?? "");
    return msg.includes("expenses_expense_number_key") || msg.includes("duplicate key");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!profile || Number.isNaN(amount) || amount <= 0) {
      toast.error("Tutar geçerli bir sayı olmalı.");
      return;
    }
    if (!receiptUrl) {
      toast.error("Fiş yüklemek zorunludur");
      return;
    }
    if (oldReceiptNeedsConfirm && !oldReceiptConfirmed) {
      toast.error("Bu fiş 2 aydan eski görünüyor. Devam etmek için onaylayın.");
      return;
    }

    const kdErr: KategoriDetayErrors = {};
    if (form.expense_type === "Yakıt") {
      const km = (kategoriDetay as { km?: unknown }).km;
      if (km === "" || km == null || Number(km) <= 0) kdErr.km = "Lütfen KM bilgisini giriniz";
    } else if (form.expense_type === "Yemek") {
      const v = (kategoriDetay as { kisi_sayisi?: unknown }).kisi_sayisi;
      if (v === "" || v == null || Number(v) <= 0) kdErr.kisi_sayisi = "Lütfen kişi sayısını giriniz";
    } else if (form.expense_type === "Konaklama") {
      const v = (kategoriDetay as { gece_sayisi?: unknown }).gece_sayisi;
      if (v === "" || v == null || Number(v) <= 0) kdErr.gece_sayisi = "Lütfen gece sayısını giriniz";
    } else if (form.expense_type === "Ulaşım") {
      const tip = (kategoriDetay as { tip?: unknown }).tip;
      const deger = (kategoriDetay as { deger?: unknown }).deger;
      if (!tip) kdErr.tip = "Lütfen ulaşım tipini seçiniz";
      if (deger === "" || deger == null || Number(deger) <= 0) kdErr.deger = "Lütfen değer bilgisini giriniz";
    } else if (form.expense_type === "Diğer") {
      const a = String((kategoriDetay as { aciklama?: unknown }).aciklama ?? "").trim();
      if (!a) kdErr.aciklama = "Lütfen ne için harcandığını açıklayınız";
    }
    setKategoriDetayErrors(kdErr);
    if (Object.keys(kdErr).length) {
      toast.error("Ek bilgiler eksik.");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/expenses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iban: form.iban || profile.iban || "",
          expense_type: form.expense_type,
          amount,
          description: form.description || "",
          receipt_url: receiptUrl,
          ai_analysis: analysis ? JSON.stringify(analysis) : null,
          manuel_giris: manuelGiris,
          eski_fis: oldReceiptNeedsConfirm && oldReceiptConfirmed,
          fis_hash: fisHash || null,
          il: selectedIl || profile.il || "",
          kategori_detay: kategoriDetay,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as
        | { ok: true; id: string; expense_number: string }
        | { error?: string };

      if (!res.ok) {
        if (res.status === 409) {
          const msg = (payload as { error?: string } | null)?.error;
          toast.error(msg || "Bu fiş daha önce kullanıldı.");
          return;
        }
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("RAW API ERROR PAYLOAD:", payload);
        }
        toast.error(getUserFriendlyApiErrorMessage(payload, "Kayıt oluşturulamadı."), {
          description:
            process.env.NODE_ENV === "development"
              ? getDevErrorText((payload as { error?: unknown; code?: unknown; details?: unknown } | null)?.error ?? payload)
              : undefined,
        });
        return;
      }

      const expenseNumber = (payload as { expense_number: string }).expense_number;
      const expenseId = (payload as { id: string }).id;

      if (expenseId && profile.bolge) {
        notifyApi({
          toRole: "bolge",
          bolge: profile.bolge,
          expenseId,
          message: `[${expenseNumber}] yeni harcama bölge onayı bekliyor.`,
          pushTitle: "TAMGA - Yeni Harcama",
          pushBody: `${profile.full_name} · ${expenseNumber} · ${formatCurrency(amount)} onay bekliyor`,
          pushUrl: "/dashboard/bolge",
        });
      }

      toast.success(
        `${expenseNumber} gönderildi, bölge sorumlusunun onayı bekleniyor.`
      );
      // on success, remove draft
      await supabase.from("expense_drafts").delete().eq("user_id", profile.id);
      window.location.href = "/dashboard/deneyap";
      return;
    } catch (err: unknown) {
      logRawError(err, "DeneyapYeniPage.handleSubmit");
      toast.error(getUserFriendlyErrorMessage(err), {
        description: process.env.NODE_ENV === "development" ? getDevErrorText(err) : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
        Profil bulunamadı. Lütfen giriş yapın.
      </div>
    );
  }

  const amountParsed = parseFloat(String(form.amount ?? "").replace(",", "."));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/deneyap">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold text-slate-800">Yeni Harcama</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {draftBanner === "visible" && draftId && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">📝 Kayıtlı taslağınız var</div>
                <div className="mt-1 text-sm text-slate-600">Devam etmek ister misiniz?</div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDraftBanner("hidden")}>
                Kapat
              </Button>
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" onClick={() => void loadDraft()} disabled={submitting}>
                Devam Et
              </Button>
              <Button type="button" variant="outline" onClick={() => void deleteDraft()} disabled={submitting}>
                Sil
              </Button>
            </div>
          </div>
        )}
        {!templateDismissed && lastTemplate && (
          <div className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 p-4 text-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">⚡ Geçen seferki gibi doldur</div>
                <div className="mt-1 text-sm text-slate-600">
                  {lastTemplate.expense_type} · {formatCurrency(lastTemplate.amount)}
                  {lastTemplate.description ? ` · “${String(lastTemplate.description).slice(0, 40)}”` : ""}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTemplateDismissed(true)}
              >
                Kapat
              </Button>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  setForm((f) => ({
                    ...f,
                    expense_type: lastTemplate.expense_type,
                    amount: String(lastTemplate.amount),
                    description: String(lastTemplate.description ?? ""),
                  }));
                  setKategoriDetay(
                    (lastTemplate.kategori_detay && typeof lastTemplate.kategori_detay === "object"
                      ? (lastTemplate.kategori_detay as KategoriDetay)
                      : {}) as KategoriDetay
                  );
                }}
              >
                Kullan
              </Button>
            </div>
          </div>
        )}
        {oldReceiptNeedsConfirm && !oldReceiptConfirmed && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="font-medium">
              ⚠️ Bu fiş 2 aydan eski görünüyor. Devam etmek istiyor musunuz?
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="default"
                onClick={() => setOldReceiptConfirmed(true)}
                disabled={submitting}
              >
                Evet, devam et
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOldReceiptNeedsConfirm(false);
                  setOldReceiptConfirmed(false);
                  setReceiptUrl("");
                  setAnalysis(null);
                  setFisHash("");
                }}
                disabled={submitting}
              >
                İptal
              </Button>
            </div>
          </div>
        )}
        {vekaletIller.length > 0 && (
          <div className="space-y-2">
            <Label>İl Seçimi</Label>
            <Select value={selectedIl} onValueChange={setSelectedIl} disabled={submitting}>
              <SelectTrigger>
                <SelectValue placeholder="İl seçin" />
              </SelectTrigger>
              <SelectContent>
                {profile.il && (
                  <SelectItem value={profile.il}>
                    {profile.il} (Kendi İlin)
                  </SelectItem>
                )}
                {vekaletIller
                  .filter((x) => !profile.il || x !== profile.il)
                  .map((il) => (
                    <SelectItem key={il} value={il}>
                      {il} (Vekaleten)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Hangi il adına harcama oluşturulacak?</p>
          </div>
        )}
        {/* 1. ADIM — Fiş Yükle */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">1. ADIM — Fiş yükle</h2>
          <ReceiptUploader
            userId={profile.id}
            onUploaded={setReceiptUrl}
            onAnalysisStart={() => setAnalyzing(true)}
            onAnalysisResult={handleAnalysisResult}
            disabled={submitting}
          />
          {analyzing && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              <span>Fiş analiz ediliyor...</span>
            </div>
          )}
          {(analysis || receiptUrl) && !analyzing && (
            <AiAnalysisBox
              analysis={analysis}
              onUseManual={() => {
                setAnalysis(null);
                setReceiptUrl("");
                setFisHash("");
                setAiSnapshot(null);
                setManuelGiris(true);
                setOldReceiptNeedsConfirm(false);
                setOldReceiptConfirmed(false);
              }}
            />
          )}
        </div>

        {/* 2. ADIM — Kişi Bilgileri */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">2. ADIM — Kişi bilgileri</h2>
          <div className="space-y-2">
            <Label>Ad Soyad</Label>
            <Input value={profile.full_name} readOnly disabled className="bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={form.iban}
              onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              disabled={submitting}
            />
          </div>
        </div>

        {/* 3. ADIM — Harcama Bilgileri */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">3. ADIM — Harcama bilgileri</h2>
          <p className="text-xs text-slate-500">Fiş yüklerseniz alanlar otomatik dolar; isterseniz elle değiştirebilirsiniz.</p>
          <div className="space-y-2">
            <Label htmlFor="expense_type">Tür</Label>
            <Select
              value={form.expense_type}
              onValueChange={(v) => {
                const next = { ...form, expense_type: v as ExpenseType };
                setForm(next);
                setKategoriDetayErrors({});
                const nextType = v as ExpenseType;
                if (nextType === "Yakıt") setKategoriDetay({ km: "" });
                else if (nextType === "Yemek") setKategoriDetay({ kisi_sayisi: "" });
                else if (nextType === "Konaklama") setKategoriDetay({ gece_sayisi: "" });
                else if (nextType === "Ulaşım") setKategoriDetay({ tip: "km", deger: "" });
                else if (nextType === "Diğer") setKategoriDetay({ aciklama: "" });
                else setKategoriDetay({});
                if (!manuelGiris) {
                  if (aiSnapshot) {
                    if (
                      next.amount !== aiSnapshot.amount ||
                      next.expense_type !== aiSnapshot.expense_type ||
                      next.description !== aiSnapshot.description
                    )
                      setManuelGiris(true);
                  } else {
                    setManuelGiris(true);
                  }
                }
              }}
              disabled={submitting}
            >
              <SelectTrigger id="expense_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <KategoriEkAlanlari
            category={form.expense_type}
            amount={Number.isFinite(amountParsed) ? amountParsed : null}
            value={kategoriDetay}
            onChange={(next) => {
              setKategoriDetay(next);
              setKategoriDetayErrors({});
            }}
            errors={kategoriDetayErrors}
            disabled={submitting}
          />
          <div className="space-y-2">
            <Label htmlFor="amount">Tutar (₺)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => {
                const next = { ...form, amount: e.target.value };
                setForm(next);
                if (!manuelGiris) {
                  if (aiSnapshot) {
                    if (
                      next.amount !== aiSnapshot.amount ||
                      next.expense_type !== aiSnapshot.expense_type ||
                      next.description !== aiSnapshot.description
                    )
                      setManuelGiris(true);
                  } else {
                    setManuelGiris(true);
                  }
                }
              }}
              placeholder="0,00"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => {
                const next = { ...form, description: e.target.value };
                setForm(next);
                if (!manuelGiris) {
                  if (aiSnapshot) {
                    if (
                      next.amount !== aiSnapshot.amount ||
                      next.expense_type !== aiSnapshot.expense_type ||
                      next.description !== aiSnapshot.description
                    )
                      setManuelGiris(true);
                  } else {
                    setManuelGiris(true);
                  }
                }
              }}
              placeholder="Kısa açıklama"
              rows={2}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={submitting}
            onClick={() => void saveDraft(false)}
          >
            Taslak Kaydet
          </Button>
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !receiptUrl}
          >
            {submitting ? "Gönderiliyor..." : "Gönder"}
          </Button>
        </div>
      </form>
    </div>
  );
}
