"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REGION_LIMIT_SLUGS } from "@/lib/region-names";
import { regionToTurkish } from "@/lib/region-names";
import { BOLGE_ILLER } from "@/lib/bolge-iller";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  Trash2,
  UserCog,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: Array<{
  value: string;
  label: string;
  emoji: string;
  badgeVariant: "secondary" | "default" | "warning" | "success" | "destructive";
}> = [
  { value: "deneyap", label: "Deneyap Sorumlusu", emoji: "🧪", badgeVariant: "secondary" },
  { value: "il", label: "İl Sorumlusu", emoji: "🏛️", badgeVariant: "default" },
  { value: "bolge", label: "Bölge Sorumlusu", emoji: "🗺️", badgeVariant: "warning" },
  { value: "koordinator", label: "Koordinatör", emoji: "🧭", badgeVariant: "success" },
  { value: "muhasebe", label: "Muhasebe", emoji: "💳", badgeVariant: "secondary" },
  { value: "yk", label: "YK Başkanı", emoji: "👔", badgeVariant: "default" },
  { value: "admin", label: "Admin", emoji: "🛡️", badgeVariant: "destructive" },
];

const allIller = Array.from(new Set(Object.values(BOLGE_ILLER).flat())).sort();

function needsIl(role: string): boolean {
  return role === "deneyap" || role === "il";
}
function needsBolge(role: string): boolean {
  return ["deneyap", "il", "bolge"].includes(role);
}

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  il: string | null;
  bolge: string | null;
  iban: string | null;
  phone: string | null;
  is_suspended?: boolean;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "K";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatIban(input: string): string {
  const raw = input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const withTR = raw.startsWith("TR") ? raw : `TR${raw.replace(/^TR/i, "")}`;
  return withTR.match(/.{1,4}/g)?.join(" ") ?? withTR;
}

function passwordStrength(pw: string): { label: string; pct: number; color: string } {
  const v = pw ?? "";
  let score = 0;
  if (v.length >= 8) score += 1;
  if (v.length >= 12) score += 1;
  if (/[A-Z]/.test(v)) score += 1;
  if (/[a-z]/.test(v)) score += 1;
  if (/[0-9]/.test(v)) score += 1;
  if (/[^A-Za-z0-9]/.test(v)) score += 1;

  if (score <= 2) return { label: "Zayıf", pct: 33, color: "bg-red-500" };
  if (score <= 4) return { label: "Orta", pct: 66, color: "bg-amber-500" };
  return { label: "Güçlü", pct: 100, color: "bg-emerald-600" };
}

export default function AdminKullanicilarIdPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    role: "deneyap",
    il: "",
    bolge: "",
    iban: "",
    phone: "",
  });
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendNext, setSuspendNext] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) {
        setError("Kullanıcı bulunamadı");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProfile(data);
      const suspended = !!(data as { is_suspended?: boolean }).is_suspended;
      setIsSuspended(suspended);
      setSuspendNext(suspended);
      setForm({
        full_name: data.full_name ?? "",
        role: data.role ?? "deneyap",
        il: data.il ?? "",
        bolge: data.bolge ?? "",
        iban: data.iban ?? "",
        phone: data.phone ?? "",
      });
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          role: form.role,
          il: form.il || null,
          bolge: form.bolge || null,
          iban: form.iban || null,
          phone: form.phone || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Kaydedilemedi");
        setSaving(false);
        return;
      }
      setProfile((p) => (p ? { ...p, ...form } : null));
      setSaving(false);
    } catch {
      setError("Bağlantı hatası");
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetPassword.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır");
      return;
    }
    if (!confirm("Bu kullanıcının şifresini sıfırlamak istediğinize emin misiniz?")) return;
    setResetting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Şifre sıfırlanamadı");
        setResetting(false);
        return;
      }
      setResetPassword("");
      setResetting(false);
    } catch {
      setError("Bağlantı hatası");
      setResetting(false);
    }
  };

  const handleSuspend = async () => {
    const msg = suspendNext
      ? "Bu hesabı askıya almak istediğinize emin misiniz? Kullanıcı giriş yapamaz."
      : "Hesabın askıya alınmasını kaldırmak istediğinize emin misiniz?";
    if (!confirm(msg)) return;
    setSuspending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend: suspendNext }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "İşlem yapılamadı");
        setSuspending(false);
        return;
      }
      setIsSuspended(suspendNext);
      setSuspending(false);
    } catch {
      setError("Bağlantı hatası");
      setSuspending(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/delete`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || "Silinemedi");
        setDeleting(false);
        return;
      }
      setDeleting(false);
      setDeleteOpen(false);
      router.push("/dashboard/admin/kullanicilar");
      router.refresh();
    } catch {
      setError("Bağlantı hatası");
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-4 text-slate-500">Yükleniyor...</div>;
  if (error && !profile) return <div className="p-4 text-red-600">{error}</div>;
  if (!profile) return null;

  const roleMeta =
    ROLE_OPTIONS.find((r) => r.value === (form.role || profile.role)) ??
    ROLE_OPTIONS[0];
  const strength = passwordStrength(resetPassword);
  const suspendButtonDisabled = suspendNext === isSuspended;
  const suspendButtonLabel = isSuspended
    ? suspendNext
      ? "Askıda"
      : "Askıyı Kaldır"
    : suspendNext
      ? "Askıya Al"
      : "Aktif";

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/admin/kullanicilar"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kullanıcı listesi
        </Link>
        <Badge variant="outline" className="border-slate-200 text-slate-700">
          <UserCog className="h-3.5 w-3.5 mr-1.5" />
          Yönetici
        </Badge>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol kolon (2/3) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Avatar kartı */}
          <Card className="overflow-hidden">
            <div className="h-1 w-full bg-[#1E2761]" />
            <CardContent className="pt-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-[#1E2761] text-white flex items-center justify-center text-xl font-bold shrink-0">
                  {getInitials(form.full_name || profile.full_name || \"Kullanıcı\")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900 truncate">
                      {form.full_name || profile.full_name || \"Kullanıcı\"}
                    </h1>
                    <Badge variant={roleMeta.badgeVariant}>
                      <span className="mr-1">{roleMeta.emoji}</span>
                      {roleMeta.label}
                    </Badge>
                    <span className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <span
                        className={cn(
                          \"h-2.5 w-2.5 rounded-full\",
                          isSuspended ? \"bg-red-500\" : \"bg-emerald-500\"
                        )}
                      />
                      {isSuspended ? \"Askıda\" : \"Aktif\"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{profile.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Temel Bilgiler */}
            <Card className="overflow-hidden">
              <div className="h-1 w-full bg-slate-200" />
              <CardHeader>
                <CardTitle className="text-slate-900">Temel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Ad Soyad</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, full_name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, role: v, il: \"\", bolge: \"\" }))
                    }
                  >
                    <SelectTrigger className="focus:ring-[#1E2761]/30">
                      <SelectValue placeholder="Rol seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <span className="mr-2">{o.emoji}</span>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={cn(\"space-y-2\", !needsIl(form.role) && \"opacity-50\")}>
                    <Label>İl</Label>
                    <Select
                      value={form.il}
                      onValueChange={(v) => setForm((f) => ({ ...f, il: v }))}
                      disabled={!needsIl(form.role)}
                    >
                      <SelectTrigger className="focus:ring-[#1E2761]/30">
                        <SelectValue placeholder="İl seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {allIller.map((il) => (
                          <SelectItem key={il} value={il}>
                            {il}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={cn(\"space-y-2\", !needsBolge(form.role) && \"opacity-50\")}>
                    <Label>Bölge</Label>
                    <Select
                      value={form.bolge}
                      onValueChange={(v) => setForm((f) => ({ ...f, bolge: v }))}
                      disabled={!needsBolge(form.role)}
                    >
                      <SelectTrigger className="focus:ring-[#1E2761]/30">
                        <SelectValue placeholder="Bölge seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGION_LIMIT_SLUGS.map((slug) => (
                          <SelectItem key={slug} value={slug}>
                            {regionToTurkish(slug)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* İletişim Bilgileri */}
            <Card className="overflow-hidden">
              <div className="h-1 w-full bg-slate-200" />
              <CardHeader>
                <CardTitle className="text-slate-900">İletişim Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={form.iban}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, iban: formatIban(e.target.value) }))
                    }
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    inputMode="text"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="05xx xxx xx xx"
                    inputMode="tel"
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </div>

        {/* Sağ kolon (1/3) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Şifre Sıfırla */}
          <Card className="overflow-hidden">
            <div className="h-1 w-full bg-red-500" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-600" />
                Şifre Sıfırla
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Yeni şifre (min 8 karakter)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? \"text\" : \"password\"}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    aria-label={showPassword ? \"Gizle\" : \"Göster\"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Güç</span>
                  <span className={cn(\"font-medium\", strength.label === \"Zayıf\" ? \"text-red-600\" : strength.label === \"Orta\" ? \"text-amber-600\" : \"text-emerald-700\")}>
                    {strength.label}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={cn(\"h-full\", strength.color)} style={{ width: `${strength.pct}%` }} />
                </div>
              </div>

              <Button
                type="button"
                className="w-full"
                variant="destructive"
                onClick={handleResetPassword}
                disabled={resetting || resetPassword.length < 8}
              >
                {resetting ? "..." : "Şifreyi Sıfırla"}
              </Button>
            </CardContent>
          </Card>

          {/* Hesap Durumu */}
          <Card className="overflow-hidden">
            <div className="h-1 w-full bg-amber-500" />
            <CardHeader>
              <CardTitle>Hesap Durumu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-700">Mevcut durum</span>
                <span className="inline-flex items-center gap-2 text-sm">
                  <span className={cn(\"h-2.5 w-2.5 rounded-full\", isSuspended ? \"bg-red-500\" : \"bg-emerald-500\")} />
                  <span className="font-medium text-slate-900">{isSuspended ? "Askıda" : "Aktif"}</span>
                </span>
              </div>

              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={suspendNext}
                  onChange={(e) => setSuspendNext(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="font-medium">Askıya al</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Askıya alınan kullanıcı giriş yapamaz. İşlemi onaylamak için butona basın.
                  </span>
                </span>
              </label>

              <Button
                type="button"
                className="w-full"
                onClick={handleSuspend}
                disabled={suspending || suspendButtonDisabled}
                variant={suspendNext ? "destructive" : "secondary"}
              >
                {suspending ? "..." : suspendButtonLabel}
              </Button>
            </CardContent>
          </Card>

          {/* Tehlikeli Alan */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700">Tehlikeli Alan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                Bu işlem geri alınamaz. Hesap silinirse kullanıcı giriş yapamaz ve ilgili veriler etkilenebilir.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hesabı Sil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hesabı silmek istiyor musunuz?</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Devam ederseniz kullanıcı hesabı kalıcı olarak silinecek.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Kullanıcı: <span className="font-semibold">{profile.email}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Vazgeç
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Siliniyor..." : "Evet, sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
