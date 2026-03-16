"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { REGION_LIMIT_SLUGS } from "@/lib/region-names";
import { regionToTurkish } from "@/lib/region-names";
import { ArrowLeft } from "lucide-react";

const TARGET_ROLES = [
  { value: "all", label: "Tüm kullanıcılar" },
  { value: "deneyap", label: "Deneyap Sorumluları" },
  { value: "il", label: "İl Sorumluları" },
  { value: "bolge", label: "Bölge Sorumluları" },
  { value: "koordinator", label: "Koordinatörler" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "yk", label: "YK Başkanı" },
];

export default function AdminDuyurularYeniPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>(["all"]);
  const [targetBolge, setTargetBolge] = useState<string>("");

  const toggleRole = (value: string) => {
    if (value === "all") {
      setTargetRoles(["all"]);
      return;
    }
    setTargetRoles((prev) => {
      const next = prev.filter((r) => r !== "all");
      if (next.includes(value)) return next.filter((r) => r !== value);
      return [...next, value];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Başlık zorunludur");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          target_roles: targetRoles.length ? targetRoles : ["all"],
          target_bolge: targetBolge && targetBolge !== "all" ? targetBolge : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Duyuru oluşturulamadı");
        setLoading(false);
        return;
      }
      router.push("/dashboard/admin/duyurular");
      router.refresh();
    } catch {
      setError("Bağlantı hatası");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href="/dashboard/admin/duyurular"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Duyuru listesi
      </Link>
      <h1 className="text-xl font-bold text-slate-900">Yeni Duyuru</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label>Başlık *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Duyuru başlığı"
          />
        </div>
        <div className="space-y-2">
          <Label>İçerik</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="resize-y"
            placeholder="Duyuru metni..."
          />
        </div>
        <div className="space-y-2">
          <Label>Hedef roller</Label>
          <div className="flex flex-wrap gap-2">
            {TARGET_ROLES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={targetRoles.includes(r.value)}
                  onChange={() => toggleRole(r.value)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Bölge filtresi (opsiyonel)</Label>
          <Select value={targetBolge || "all"} onValueChange={setTargetBolge}>
            <SelectTrigger>
              <SelectValue placeholder="Tüm bölgeler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm bölgeler</SelectItem>
              {REGION_LIMIT_SLUGS.map((slug) => (
                <SelectItem key={slug} value={slug}>
                  {regionToTurkish(slug)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Yayınlanıyor..." : "Yayınla"}
          </Button>
          <Link href="/dashboard/admin/duyurular">
            <Button type="button" variant="outline">
              İptal
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
