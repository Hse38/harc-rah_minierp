"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileLanguage, NotificationPrefs } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getProfileT,
  PROFILE_LANGUAGE_OPTIONS,
  PROFILE_LANG_STORAGE_KEY,
} from "@/lib/i18n/profile";
import { regionToTurkish } from "@/lib/region-names";
import { validatePhone } from "./phone-validate";

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
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [lang, setLang] = useState<ProfileLanguage>(
    (initialProfile?.language as ProfileLanguage) ?? "tr"
  );
  const [iban, setIban] = useState(initialProfile?.iban ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState<
    NotificationPrefs
  >(
    (initialProfile?.notification_prefs as NotificationPrefs) ?? {
      expense_approved: true,
      expense_rejected: true,
      expense_pending: true,
      limit_warning: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const t = getProfileT(lang);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(PROFILE_LANG_STORAGE_KEY) : null;
    if (stored && (stored === "tr" || stored === "az" || stored === "ky")) {
      setLang(stored as ProfileLanguage);
    } else if (initialProfile?.language) {
      setLang(initialProfile.language as ProfileLanguage);
    }
  }, [initialProfile?.language]);

  const ibanError = useMemo(() => {
    if (!iban.trim()) return null;
    return validateIban(iban) ? null : t.ibanError;
  }, [iban, t.ibanError]);

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
    if (newPassword.length < 8) return t.newPasswordMin;
    if (!/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) return t.newPasswordMin;
    if (newPassword !== newPasswordConfirm) return t.newPasswordMismatch;
    return null;
  }, [passwordFilled, newPassword, newPasswordConfirm, t]);

  const hasProfileChanges =
    profile &&
    (iban !== (profile.iban ?? "") ||
      phone !== (profile.phone ?? "") ||
      lang !== (profile.language ?? "tr") ||
      JSON.stringify(notificationPrefs) !==
        JSON.stringify(profile.notification_prefs ?? {}));
  const hasValidProfile = hasProfileChanges && !ibanError && !phoneError;
  const hasValidPassword =
    passwordFilled && passwordValid && passwordMatch && !passwordError;
  const canSave = ((hasValidProfile || hasValidPassword) && !saving) ?? false;

  const handleLangChange = (l: ProfileLanguage) => {
    setLang(l);
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
          })
          .eq("id", profile.id);
      }

      if (hasValidPassword) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) {
          toast.error(error.message);
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
            }
          : null
      );
      if (typeof window !== "undefined") {
        localStorage.setItem(PROFILE_LANG_STORAGE_KEY, lang);
      }
      const msg =
        lang === "tr"
          ? "Profil güncellendi"
          : lang === "az"
            ? "Profil yeniləndi"
            : "Профиль жаңыртылды";
      toast.success(msg);
    } catch {
      toast.error(t.toastError);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOutAll() {
    setSigningOutAll(true);
    try {
      await supabase.auth.signOut({ scope: "global" });
      const msg =
        lang === "tr"
          ? "Tüm cihazlardan çıkış yapıldı"
          : lang === "az"
            ? "Bütün cihazlardan çıxış edildi"
            : "Бардык түзмөктөрдөн чыгышты";
      toast.success(msg);
      window.location.href = "/login";
    } catch {
      toast.error(t.toastError);
    } finally {
      setSigningOutAll(false);
    }
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        Profil yüklenemedi. Sayfayı yenileyin.
      </div>
    );
  }

  const roleKey = ROLE_KEYS.includes(profile.role as (typeof ROLE_KEYS)[number])
    ? profile.role
    : "deneyap";
  const roleLabel =
    (t as Record<string, string>)[`role_${roleKey}`] ?? profile.role;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold text-slate-800">{t.title}</h1>
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
                  {[profile.il, profile.bolge ? regionToTurkish(profile.bolge) : null]
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
            {t.editableInfo}
          </h3>
          <div className="space-y-2">
            <Label htmlFor="iban">{t.iban}</Label>
            <Input
              id="iban"
              value={iban}
              onChange={(e) =>
                setIban(
                  e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 26)
                )
              }
              placeholder={t.ibanPlaceholder}
              className={cn(
                ibanError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            {ibanError && (
              <p className="text-sm text-red-600">{ibanError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t.phoneOptional}</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholderTR}
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
            {t.languagePref}
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
            {t.notificationPrefs}
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
            <span className="text-sm">{t.notifyExpenseApproved}</span>
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
            <span className="text-sm">{t.notifyExpenseRejected}</span>
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
            <span className="text-sm">{t.notifyExpensePending}</span>
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
            <span className="text-sm">{t.notifyLimitWarning}</span>
          </label>
        </CardContent>
      </Card>

      {/* 5. Güvenlik: Şifre değiştir */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 md:text-lg md:font-semibold">
            {t.security}
          </h3>
          <p className="text-xs text-slate-500">{t.changePassword}</p>
          <div className="space-y-2">
            <Label htmlFor="new">{t.newPassword}</Label>
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
            <Label htmlFor="confirm">{t.newPasswordRepeat}</Label>
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
          <p className="text-xs text-slate-500">{t.newPasswordMin}</p>
        </CardContent>
      </Card>

      {/* 6. Son aktivite */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 md:text-lg md:font-semibold">
            {t.lastActivity}
          </h3>
          {sessionCreatedAt && (
            <p className="text-sm text-slate-600">
              {t.lastSignIn}:{" "}
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
            {signingOutAll ? "..." : t.signOutAll}
          </Button>
        </CardContent>
      </Card>

      <div className="md:flex md:justify-end">
        <Button
          className="w-full md:w-auto h-11"
          disabled={!canSave || saving}
          onClick={handleSave}
        >
          {saving ? t.saving : t.save}
        </Button>
      </div>
        </div>
      </div>
    </div>
  );
}
