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
import { notifyApi } from "@/lib/notify-api";
import { ArrowLeft, Users, GraduationCap, Building2, Map, Briefcase, Wallet, Landmark, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_CARDS = [
  { value: "all", label: "Tüm Kullanıcılar", desc: "Sistemdeki herkese gönder", icon: Users },
  { value: "deneyap", label: "Deneyap Sorumluları", desc: "Deneyap rolündeki kullanıcılar", icon: GraduationCap },
  { value: "il", label: "İl Sorumluları", desc: "İl sorumluları", icon: Building2 },
  { value: "bolge", label: "Bölge Sorumluları", desc: "Bölge sorumluları", icon: Map },
  { value: "koordinator", label: "Koordinatörler", desc: "Koordinatör rolü", icon: Briefcase },
  { value: "muhasebe", label: "Muhasebe", desc: "Muhasebe ekibi", icon: Wallet },
  { value: "yk", label: "YK Başkanı", desc: "YK Başkanı", icon: Landmark },
];

const ROLES_FOR_ALL = ["deneyap", "il", "bolge", "koordinator", "muhasebe", "yk"];
const MAX_CONTENT_LENGTH = 2000;

export default function AdminDuyurularYeniPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>(["all"]);
  const [targetBolge, setTargetBolge] = useState<string>("");

  const isAll = targetRoles.includes("all");
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

  const rolesToNotify = isAll ? ROLES_FOR_ALL : targetRoles.filter((r) => r !== "all");
  const targetSummary =
    isAll
      ? "Tüm kullanıcılara"
      : rolesToNotify.length === 0
        ? "Hedef seçilmedi"
        : `${rolesToNotify.length} role gönderilecek`;

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

      const pushTitle = "TAMGA - Yeni Duyuru";
      const pushBody = title.trim();
      const pushUrl = "/dashboard/profil";
      const bolgeParam = targetBolge && targetBolge !== "all" ? targetBolge : undefined;

      for (const role of rolesToNotify) {
        try {
          await notifyApi({
            toRole: role,
            expenseId: "system",
            message: pushBody,
            pushTitle,
            pushBody,
            pushUrl,
            ...(role === "bolge" && bolgeParam && { bolge: bolgeParam }),
          });
        } catch {
          // devam et, tek rol hatası tümünü bozmasın
        }
      }

      router.push("/dashboard/admin/duyurular");
      router.refresh();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        href="/dashboard/admin/duyurular"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Duyuru listesi
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Yeni Duyuru</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol: Form (2/3) */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-base font-semibold">Başlık *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Duyuru başlığı"
                className="h-12 text-lg rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">İçerik</Label>
              <div className="relative">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                  placeholder="Duyuru metni..."
                  className="min-h-[200px] resize-y rounded-xl border-slate-200 pr-16"
                  maxLength={MAX_CONTENT_LENGTH}
                />
                <span className="absolute bottom-3 right-3 text-xs text-slate-400 tabular-nums">
                  {content.length} / {MAX_CONTENT_LENGTH}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Hedef roller</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLE_CARDS.map((r) => {
                  const Icon = r.icon;
                  const selected = targetRoles.includes(r.value);
                  const disabled = isAll && r.value !== "all";
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => !disabled && toggleRole(r.value)}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                        selected
                          ? "border-blue-500 bg-blue-50/50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                        disabled && "opacity-60 cursor-not-allowed bg-slate-50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{r.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">Bölge filtresi (opsiyonel)</Label>
              <Select value={targetBolge || "all"} onValueChange={setTargetBolge}>
                <SelectTrigger className="rounded-xl border-slate-200 h-11">
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

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 h-11"
              >
                {loading ? "Yayınlanıyor..." : "Yayınla 🚀"}
              </Button>
              <Link href="/dashboard/admin/duyurular">
                <Button type="button" variant="outline" className="rounded-xl h-11">
                  İptal
                </Button>
              </Link>
            </div>
          </form>
        </div>

        {/* Sağ: Canlı önizleme (1/3) */}
        <div className="space-y-6">
          <div className="lg:sticky lg:top-6 space-y-6">
            <p className="text-sm font-medium text-slate-500">Canlı önizleme</p>

            {/* Duyuru kartı önizleme */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-slate-900">
                  {title.trim() || "Başlık burada görünecek"}
                </span>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-4">
                {content.trim() || "İçerik burada görünecek..."}
              </p>
            </div>

            {/* Hedef kitle özeti */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Hedef kitle
              </p>
              <p className="text-sm font-medium text-slate-700">{targetSummary}</p>
              {targetBolge && targetBolge !== "all" && (
                <p className="text-xs text-slate-500 mt-1">
                  Bölge: {regionToTurkish(targetBolge)}
                </p>
              )}
            </div>

            {/* Web push önizleme */}
            <div className="rounded-xl border border-slate-200 bg-slate-900 p-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                Web push bildirimi
              </p>
              <div className="rounded-lg bg-white p-3 shadow-lg border border-slate-200 max-w-[280px]">
                <p className="text-xs text-slate-500 mb-0.5">TAMGA - Yeni Duyuru</p>
                <p className="text-sm font-medium text-slate-900 line-clamp-2">
                  {title.trim() || "Duyuru başlığı"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
