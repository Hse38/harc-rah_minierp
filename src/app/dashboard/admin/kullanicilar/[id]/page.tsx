"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Shield } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "deneyap", label: "Deneyap Sorumlusu" },
  { value: "il", label: "İl Sorumlusu" },
  { value: "bolge", label: "Bölge Sorumlusu" },
  { value: "koordinator", label: "Koordinatör" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "yk", label: "YK Başkanı" },
  { value: "admin", label: "Admin" },
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
};

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
  const [suspend, setSuspend] = useState(false);
  const [suspending, setSuspending] = useState(false);

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
    const msg = suspend
      ? "Bu hesabı askıya almak istediğinize emin misiniz? Kullanıcı giriş yapamaz."
      : "Hesabın askıya alınmasını kaldırmak istediğinize emin misiniz?";
    if (!confirm(msg)) return;
    setSuspending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "İşlem yapılamadı");
        setSuspending(false);
        return;
      }
      setSuspending(false);
    } catch {
      setError("Bağlantı hatası");
      setSuspending(false);
    }
  };

  if (loading) return <div className="p-4 text-slate-500">Yükleniyor...</div>;
  if (error && !profile) return <div className="p-4 text-red-600">{error}</div>;
  if (!profile) return null;

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href="/dashboard/admin/kullanicilar"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Kullanıcı listesi
      </Link>
      <h1 className="text-xl font-bold text-slate-900">Kullanıcıyı Düzenle</h1>
      <p className="text-sm text-slate-600">Email: {profile.email}</p>
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label>Ad Soyad</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <Select
            value={form.role}
            onValueChange={(v) => setForm((f) => ({ ...f, role: v, il: "", bolge: "" }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {needsIl(form.role) && (
          <div className="space-y-2">
            <Label>İl</Label>
            <Select value={form.il} onValueChange={(v) => setForm((f) => ({ ...f, il: v }))}>
              <SelectTrigger>
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
        )}
        {needsBolge(form.role) && (
          <div className="space-y-2">
            <Label>Bölge</Label>
            <Select value={form.bolge} onValueChange={(v) => setForm((f) => ({ ...f, bolge: v }))}>
              <SelectTrigger>
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
        )}
        <div className="space-y-2">
          <Label>IBAN</Label>
          <Input
            value={form.iban}
            onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Telefon</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
          <Link href="/dashboard/admin/kullanicilar">
            <Button type="button" variant="outline">
              İptal
            </Button>
          </Link>
        </div>
      </form>

      <div className="border-t border-slate-200 pt-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Şifre Sıfırla</h2>
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label>Yeni şifre (min 8 karakter)</Label>
            <Input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleResetPassword}
            disabled={resetting || resetPassword.length < 8}
          >
            {resetting ? "..." : "Sıfırla"}
          </Button>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Shield className="h-4 w-4 text-red-600" />
          Hesabı Askıya Al
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="suspend"
            checked={suspend}
            onChange={(e) => setSuspend(e.target.checked)}
            className="rounded border-slate-300"
          />
          <Label htmlFor="suspend">Hesabı askıya al (giriş engellenecek)</Label>
        </div>
        <Button
          type="button"
          variant="destructive"
          onClick={handleSuspend}
          disabled={suspending}
        >
          {suspending ? "..." : suspend ? "Askıya Al" : "Askıyı Kaldır"}
        </Button>
      </div>
    </div>
  );
}
