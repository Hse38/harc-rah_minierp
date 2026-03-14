"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  deneyap: "Deneyap",
  il: "İl Sorumlusu",
  bolge: "Bölge Sorumlusu",
  koordinator: "Koordinatör",
  muhasebe: "Muhasebe",
  yk: "YK Başkanı",
};

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

export default function ProfilPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [iban, setIban] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const ibanError = useMemo(() => {
    if (!iban.trim()) return null;
    return validateIban(iban) ? null : "Geçerli bir IBAN girin";
  }, [iban]);

  const passwordFilled = !!(currentPassword && newPassword && newPasswordConfirm);
  const passwordMatch = newPassword === newPasswordConfirm && newPassword.length >= 6;
  const passwordError = useMemo(() => {
    if (!passwordFilled) return null;
    if (newPassword.length < 6) return "En az 6 karakter olmalı";
    if (newPassword !== newPasswordConfirm) return "Yeni şifreler eşleşmiyor";
    return null;
  }, [passwordFilled, newPassword, newPasswordConfirm]);

  const hasProfileChanges =
    (profile && (iban !== (profile.iban ?? "") || phone !== (profile.phone ?? ""))) ?? false;
  const hasValidProfile = hasProfileChanges && !ibanError;
  const hasValidPassword =
    passwordFilled &&
    currentPassword &&
    newPassword.length >= 6 &&
    newPassword === newPasswordConfirm &&
    !passwordError;
  const canSave = (hasValidProfile || hasValidPassword) && !saving;

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, iban, role, il, bolge, phone, created_at")
        .eq("id", user.id)
        .single();
      const pr = p as Profile | null;
      setProfile(pr ?? null);
      setIban(pr?.iban ?? "");
      setPhone(pr?.phone ?? "");
      setLoading(false);
    })();
  }, [supabase]);

  async function handleSave() {
    if (!profile || !canSave || saving) return;
    if (ibanError || (passwordFilled && passwordError)) return;

    setSaving(true);
    try {
      if (hasProfileChanges) {
        await supabase
          .from("profiles")
          .update({
            iban: iban.trim() || null,
            phone: phone.trim() || null,
          })
          .eq("id", profile.id);
      }

      if (passwordFilled && passwordMatch && newPassword.length >= 6) {
        const { error: signError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (signError) {
          toast.error("Mevcut şifre hatalı.");
          setSaving(false);
          return;
        }
        await supabase.auth.updateUser({ password: newPassword });
        setCurrentPassword("");
        setNewPassword("");
        setNewPasswordConfirm("");
      }

      setProfile((prev) =>
        prev ? { ...prev, iban: iban.trim() || null, phone: phone.trim() || null } : null
      );
      toast.success("Profil güncellendi.");
    } catch {
      toast.error("Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#2563EB]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        Profil bulunamadı.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold text-slate-800">Profil</h1>
      </div>

      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-[#2563EB] flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {getInitials(profile.full_name)}
          </div>
          <p className="mt-3 text-lg font-semibold text-slate-800">{profile.full_name}</p>
          <p className="text-sm text-slate-500 mt-0.5">{email}</p>
          <Badge variant="secondary" className="mt-2">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </Badge>
          {(profile.il || profile.bolge) && (
            <p className="mt-2 text-sm text-slate-600">
              {[profile.il, profile.bolge].filter(Boolean).join(" · ")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 26))}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              className={cn(ibanError && "border-red-500 focus-visible:ring-red-500")}
            />
            {ibanError && (
              <p className="text-sm text-red-600">{ibanError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon (opsiyonel)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Şifre değiştir</h3>
          <div className="space-y-2">
            <Label htmlFor="current">Mevcut şifre</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">Yeni şifre</Label>
            <Input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Yeni şifre tekrar</Label>
            <Input
              id="confirm"
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className={cn(passwordError && "border-red-500 focus-visible:ring-red-500")}
            />
            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full h-11"
        disabled={!canSave || saving}
        onClick={handleSave}
      >
        {saving ? "Kaydediliyor..." : "Kaydet"}
      </Button>
    </div>
  );
}
