"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { BOLGE_ILLER } from "@/lib/bolge-iller";
import { REGION_LIMIT_SLUGS } from "@/lib/region-names";
import { regionToTurkish } from "@/lib/region-names";
import { ArrowLeft } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "deneyap", label: "Deneyap Sorumlusu" },
  { value: "il", label: "İl Sorumlusu" },
  { value: "bolge", label: "Bölge Sorumlusu" },
  { value: "koordinator", label: "Koordinatör" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "yk", label: "YK Başkanı" },
];

const allIller = Array.from(
  new Set(Object.values(BOLGE_ILLER).flat())
).sort();

const bolgeSlugToTr: Record<string, string> = {};
REGION_LIMIT_SLUGS.forEach((s) => {
  bolgeSlugToTr[s] = regionToTurkish(s);
});

function needsIl(role: string): boolean {
  return role === "deneyap" || role === "il";
}
function needsBolge(role: string): boolean {
  return ["deneyap", "il", "bolge"].includes(role);
}

export default function AdminKullanicilarYeniPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "deneyap",
    il: "",
    bolge: "",
    iban: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
          il: form.il || null,
          bolge: form.bolge || null,
          iban: form.iban || null,
          phone: form.phone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kayıt oluşturulamadı");
        setLoading(false);
        return;
      }
      router.push("/dashboard/admin/kullanicilar");
      router.refresh();
    } catch {
      setError("Bağlantı hatası");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href="/dashboard/admin/kullanicilar"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Kullanıcı listesi
      </Link>
      <h1 className="text-xl font-bold text-slate-900">Yeni Kullanıcı</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label>Ad Soyad *</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            required
            placeholder="Ad Soyad"
          />
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            placeholder="email@ornek.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Şifre * (min 8 karakter)</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
            minLength={8}
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-2">
          <Label>Rol *</Label>
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
            <Select
              value={form.il}
              onValueChange={(v) => setForm((f) => ({ ...f, il: v }))}
            >
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
            <Select
              value={form.bolge}
              onValueChange={(v) => setForm((f) => ({ ...f, bolge: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Bölge seçin" />
              </SelectTrigger>
              <SelectContent>
                {REGION_LIMIT_SLUGS.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {bolgeSlugToTr[slug] ?? slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>IBAN (opsiyonel)</Label>
          <Input
            value={form.iban}
            onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
            placeholder="TR00 0000 0000 0000 0000 0000 00"
          />
        </div>
        <div className="space-y-2">
          <Label>Telefon (opsiyonel)</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+90 5XX XXX XX XX"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </Button>
          <Link href="/dashboard/admin/kullanicilar">
            <Button type="button" variant="outline">
              İptal
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
