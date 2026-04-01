"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileLanguage, NotificationPrefs } from "@/types";
import { DEFAULT_NOTIFICATION_PREFS } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";
import { getUserFriendlyErrorMessage, getDevErrorText, logRawError } from "@/lib/errorMessages";
import { cn } from "@/lib/utils";
import { PROFILE_LANGUAGE_OPTIONS, PROFILE_LANG_STORAGE_KEY } from "@/lib/i18n/profile";
import { useLang } from "@/contexts/LanguageContext";
import { t, type TranslationKey } from "@/lib/i18n";
import { bolgeAdi } from "@/lib/utils";
import { validatePhone } from "./phone-validate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase() || "?";
}

function validateIban(value: string): boolean {
  const s = value.replace(/\s/g, "").toUpperCase();
  return /^TR\d{24}$/.test(s);
}

function validatePassword(p: string): boolean {
  return (
    p.length >= 8 && /[A-Z]/.test(p) && /\d/.test(p)
  );
}

const ROLE_KEYS = [
  "deneyap",
  "il",
  "bolge",
  "koordinator",
  "muhasebe",
  "yk",
] as const;

interface ProfilClientProps {
  initialProfile: Profile | null;
  email: string;
  sessionCreatedAt?: string;
}

export function ProfilClient({
  initialProfile,
  email,
  sessionCreatedAt,
}: ProfilClientProps) {
  const supabase = createClient();
  const { lang: contextLang, setLang: setContextLang } = useLang();
  const lang = (contextLang as ProfileLanguage) || "tr";
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [iban, setIban] = useState(initialProfile?.iban ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    { ...DEFAULT_NOTIFICATION_PREFS, ...(initialProfile?.notification_prefs as NotificationPrefs | undefined) }
  );
  const [izinModu, setIzinModu] = useState<boolean>(!!initialProfile?.izin_modu);
  const [izinVekilId, setIzinVekilId] = useState<string>(initialProfile?.izin_vekil_id ?? "");
  const [izinBaslangic, setIzinBaslangic] = useState<string>(
    initialProfile?.izin_baslangic ? String(initialProfile.izin_baslangic).slice(0, 10) : ""
  );
  const [izinBitis, setIzinBitis] = useState<string>(
    initialProfile?.izin_bitis ? String(initialProfile.izin_bitis).slice(0, 10) : ""
  );
  const [bolgeUsers, setBolgeUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(PROFILE_LANG_STORAGE_KEY) : null;
    if (stored && (stored === "tr" || stored === "az" || stored === "ky")) {
      setContextLang(stored as ProfileLanguage);
    } else if (initialProfile?.language && (initialProfile.language === "az" || initialProfile.language === "ky")) {
      setContextLang(initialProfile.language as ProfileLanguage);
    }
  }, [initialProfile?.language, setContextLang]);

  const ibanError = useMemo(() => {
    if (!iban.trim()) return null;
    return validateIban(iban) ? null : t("misc_gecerli_iban", lang);
  }, [iban, lang]);

  const phoneValidation = useMemo(() => validatePhone(phone), [phone]);
  const phoneError = phoneValidation.valid ? null : phoneValidation.error;

  const passwordFilled = !!(newPassword && newPasswordConfirm);
  const passwordValid =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /\d/.test(newPassword);
  const passwordMatch = newPassword === newPasswordConfirm;
  const passwordError = useMemo(() => {
    if (!passwordFilled) return null;
    if (newPassword.length < 8) return t("misc_sifre_kural", lang);
    if (!/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) return t("misc_sifre_kural", lang);
    if (newPassword !== newPasswordConfirm) return t("misc_sifreler_eslesmiyor", lang);
    return null;
  }, [passwordFilled, newPassword, newPasswordConfirm, lang]);

  const hasProfileChanges =
    profile &&
    (iban !== (profile.iban ?? "") ||
      phone !== (profile.phone ?? "") ||
      lang !== (profile.language ?? "tr") ||
      JSON.stringify(notificationPrefs) !==
        JSON.stringify(profile.notification_prefs ?? {}) ||
      (profile.role === "bolge" &&
        (izinModu !== !!profile.izin_modu ||
          (izinVekilId || null) !== (profile.izin_vekil_id ?? null) ||
          (izinBaslangic || null) !== (profile.izin_baslangic ? String(profile.izin_baslangic).slice(0, 10) : null) ||
          (izinBitis || null) !== (profile.izin_bitis ? String(profile.izin_bitis).slice(0, 10) : null))));
  const hasValidProfile = hasProfileChanges && !ibanError && !phoneError;
  const hasValidPassword =
    passwordFilled && passwordValid && passwordMatch && !passwordError;
  const canSave = ((hasValidProfile || hasValidPassword) && !saving) ?? false;

  const handleLangChange = (l: ProfileLanguage) => {
    setContextLang(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(PROFILE_LANG_STORAGE_KEY, l);
    }
  };

  async function handleSave() {
    if (!profile || !canSave || saving) return;
    if (ibanError || phoneError || (passwordFilled && passwordError)) return;

    setSaving(true);
    try {
      if (hasProfileChanges && profile) {
        await supabase
          .from("profiles")
          .update({
            iban: iban.trim() || null,
            phone: phone.trim() || null,
            language: lang,
            notification_prefs: notificationPrefs,
            ...(profile.role === "bolge"
              ? {
                  izin_modu: izinModu,
                  izin_vekil_id: izinVekilId ? izinVekilId : null,
                  izin_baslangic: izinBaslangic ? new Date(izinBaslangic + "T00:00:00.000Z").toISOString() : null,
                  izin_bitis: izinBitis ? new Date(izinBitis + "T23:59:59.999Z").toISOString() : null,
                }
              : {}),
          })
          .eq("id", profile.id);
      }

      if (hasValidPassword) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) {
          logRawError(error, "ProfilClient.updateUserPassword");
          toast.error(getUserFriendlyErrorMessage(error), {
            description: process.env.NODE_ENV === "development" ? getDevErrorText(error) : undefined,
          });
          setSaving(false);
          return;
        }
        setNewPassword("");
        setNewPasswordConfirm("");
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              iban: iban.trim() || null,
              phone: phone.trim() || null,
              language: lang,
              notification_prefs: notificationPrefs,
              ...(prev.role === "bolge"
                ? {
                    izin_modu: izinModu,
                    izin_vekil_id: izinVekilId ? izinVekilId : null,
                    izin_baslangic: izinBaslangic ? new Date(izinBaslangic + "T00:00:00.000Z").toISOString() : null,
                    izin_bitis: izinBitis ? new Date(izinBitis + "T23:59:59.999Z").toISOString() : null,
                  }
                : {}),
            }
          : null
      );
      if (typeof window !== "undefined") {
        localStorage.setItem(PROFILE_LANG_STORAGE_KEY, lang);
      }
      toast.success(t("msg_profile_updated", lang));
    } catch {
      toast.error(t("misc_kaydetme_basarisiz", lang));
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOutAll() {
    setSigningOutAll(true);
    try {
      await supabase.auth.signOut({ scope: "global" });
      toast.success(t("misc_tum_oturumlari_sonlandir", lang));
      window.location.href = "/login";
    } catch {
      toast.error(t("misc_kaydetme_basarisiz", lang));
    } finally {
      setSigningOutAll(false);
    }
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        {t("misc_profil_yuklenemedi", lang)}
      </div>
    );
  }

  const roleKey = ROLE_KEYS.includes(profile.role as (typeof ROLE_KEYS)[number])
    ? profile.role
    : "deneyap";
  const roleLabelKey: TranslationKey =
    roleKey === "bolge" ? "misc_bölge_sorumlusu" : roleKey === "il" ? "misc_il_sorumlusu" : roleKey === "koordinator" ? "misc_koordinator" : roleKey === "muhasebe" ? "misc_muhasebe" : roleKey === "yk" ? "misc_yk" : "misc_deneyap";
  const roleLabel = t(roleLabelKey, lang);

  useEffect(() => {
    (async () => {
      if (!profile?.bolge || profile.role !== "bolge") return;
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,role,bolge")
        .eq("bolge", profile.bolge)
        .eq("role", "bolge")
        .order("full_name");
      const rows = (data ?? []) as { id: string; full_name: string; role: string; bolge: string }[];
      setBolgeUsers(rows.filter((u) => u.id !== profile.id).map((u) => ({ id: u.id, full_name: u.full_name })));
    })();
  }, [profile?.bolge, profile?.id, profile?.role, supabase]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold text-slate-800">{t("misc_profil_baslik", lang)}</h1>
      </div>

      <div className="md:flex md:gap-6 md:items-start">
        {/* Sol: Avatar + kişisel bilgiler */}
        <div className="md:w-1/3">
          <Card className="rounded-2xl shadow-sm overflow-hidden md:sticky md:top-6">
            <CardContent className="p-6 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[#2563EB] flex items-center justify-center text-2xl font-bold text-white shrink-0">
                {getInitials(profile.full_name)}
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-800">
                {profile.full_name}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{email}</p>
              <Badge variant="secondary" className="mt-2">
                {roleLabel}
              </Badge>
              {(profile.il || profile.bolge) && (
                <p className="mt-2 text-sm text-slate-600">
                  {[profile.il, profile.bolge ? bolgeAdi(profile.bolge) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ: Düzenlenebilir + dil + bildirim + güvenlik */}
        <div className="md:w-2/3 space-y-4">
      {/* 2. Düzenlenebilir: IBAN, Telefon */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 md:text-lg md:font-semibold">
            {t("misc_duzenlenebilir_bilgiler", lang)}
          </h3>
          <div className="space-y-2">
            <Label htmlFor="iban">{t("form_iban", lang)}</Label>
            <Input
              id="iban"
              value={iban}
              onChange={(e) =>
                setIban(
                  e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 26)
                )
              }
              placeholder={t("misc_iban_placeholder", lang)}
              className={cn(
                ibanError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            {ibanError && (
              <p className="text-sm text-red-600">{ibanError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("misc_telefon_opsiyonel", lang)}</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("misc_phone_placeholder", lang)}
              className={cn(
                phoneError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            {phoneError && (
              <p className="text-sm text-red-600">{phoneError}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Dil tercihi */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 md:text-lg md:font-semibold">
            {t("misc_dil_tercihi", lang)}
          </h3>
          <div className="flex flex-wrap gap-2">
            {PROFILE_LANGUAGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={lang === opt.value ? "default" : "outline"}
                size="sm"
                className="md:px-6 md:py-3"
                onClick={() => handleLangChange(opt.value)}
              >
                <span className="mr-1">{opt.flag}</span>
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Bildirim tercihleri */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 md:text-lg md:font-semibold">
            {t("misc_bildirim_tercihleri", lang)}
          </h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPrefs.expense_approved}
              onChange={(e) =>
                setNotificationPrefs((p) => ({
                  ...p,
                  expense_approved: e.target.checked,
                }))
              }
              className="rounded border-slate-300"
            />
            <span className="text-sm">{t("misc_harcama_onaylandi_bildir", lang)}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPrefs.expense_rejected}
              onChange={(e) =>
                setNotificationPrefs((p) => ({
                  ...p,
                  expense_rejected: e.target.checked,
                }))
              }
              className="rounded border-slate-300"
            />
            <span className="text-sm">{t("misc_harcama_reddedildi_bildir", lang)}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPrefs.expense_pending}
              onChange={(e) =>
                setNotificationPrefs((p) => ({
                  ...p,
                  expense_pending: e.target.checked,
                }))
              }
              className="rounded border-slate-300"
            />
            <span className="text-sm">{t("misc_yeni_harcama_beklerken_bildir", lang)}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPrefs.limit_warning}
              onChange={(e) =>
                setNotificationPrefs((p) => ({
                  ...p,
                  limit_warning: e.target.checked,
                }))
              }
              className="rounded border-slate-300"
            />
            <span className="text-sm">{t("misc_limit_uyarilari", lang)}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPrefs.push_enabled}
              onChange={(e) =>
                setNotificationPrefs((p) => ({
                  ...p,
                  push_enabled: e.target.checked,
                }))
              }
              className="rounded border-slate-300"
            />
            <span className="text-sm">{t("misc_web_bildirimleri", lang)}</span>
          </label>
        </CardContent>
      </Card>

      {/* 4.5 İzin modu (Bölge sorumlusu) */}
      {profile.role === "bolge" && profile.bolge && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 md:text-lg md:font-semibold">İzin / Tatil Modu</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={izinModu}
                onChange={(e) => setIzinModu(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm">İzin modunu aç</span>
            </label>

            <div className={cn("space-y-2", !izinModu && "opacity-50 pointer-events-none")}>
              <div className="space-y-1">
                <Label>Vekil</Label>
                <Select value={izinVekilId || "none"} onValueChange={(v) => setIzinVekilId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vekil seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {bolgeUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Aynı bölgedeki başka bir bölge sorumlusunu seçin.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Başlangıç (opsiyonel)</Label>
                  <Input type="date" value={izinBaslangic} onChange={(e) => setIzinBaslangic(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Bitiş (opsiyonel)</Label>
                  <Input type="date" value={izinBitis} onChange={(e) => setIzinBitis(e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Güvenlik: Şifre değiştir */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 md:text-lg md:font-semibold">
            {t("misc_guvenlik", lang)}
          </h3>
          <p className="text-xs text-slate-500">{t("misc_sifre_degistir", lang)}</p>
          <div className="space-y-2">
            <Label htmlFor="new">{t("misc_yeni_sifre", lang)}</Label>
            <Input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className={cn(
                passwordError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{t("misc_yeni_sifre_tekrar", lang)}</Label>
            <Input
              id="confirm"
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className={cn(
                passwordError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}
          </div>
          <p className="text-xs text-slate-500">{t("misc_sifre_kural", lang)}</p>
        </CardContent>
      </Card>

      {/* 6. Son aktivite */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 md:text-lg md:font-semibold">
            {t("misc_son_aktivite", lang)}
          </h3>
          {sessionCreatedAt && (
            <p className="text-sm text-slate-600">
              {t("misc_son_giris", lang)}:{" "}
              {new Date(sessionCreatedAt).toLocaleString(lang === "tr" ? "tr-TR" : lang === "az" ? "az-AZ" : "ky-KG")}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={signingOutAll}
            onClick={handleSignOutAll}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {signingOutAll ? "..." : t("misc_tum_oturumlari_sonlandir", lang)}
          </Button>
        </CardContent>
      </Card>

      <div className="md:flex md:justify-end">
        <Button
          className="w-full md:w-auto h-11"
          disabled={!canSave || saving}
          onClick={handleSave}
        >
          {saving ? t("misc_kaydediliyor", lang) : t("action_save", lang)}
        </Button>
      </div>
        </div>
      </div>
    </div>
  );
}
