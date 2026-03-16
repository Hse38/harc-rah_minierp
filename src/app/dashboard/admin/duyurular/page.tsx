"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Megaphone } from "lucide-react";
import { regionToTurkish } from "@/lib/region-names";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  target_roles: string[];
  target_bolge: string | null;
  is_active: boolean;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  all: "Tümü",
  deneyap: "Deneyap",
  il: "İl",
  bolge: "Bölge",
  koordinator: "Koord.",
  muhasebe: "Muhasebe",
  yk: "YK",
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  all: "bg-slate-100 text-slate-700",
  deneyap: "bg-violet-100 text-violet-800",
  il: "bg-sky-100 text-sky-800",
  bolge: "bg-amber-100 text-amber-800",
  koordinator: "bg-emerald-100 text-emerald-800",
  muhasebe: "bg-rose-100 text-rose-800",
  yk: "bg-indigo-100 text-indigo-800",
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDuyurularPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Announcement | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchList = async () => {
    const res = await fetch("/api/admin/announcements");
    const data = await res.json();
    if (res.ok) setList(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleToggleActive = async (a: Announcement) => {
    setToggling(a.id);
    const res = await fetch(`/api/admin/announcements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !a.is_active }),
    });
    setToggling(null);
    if (res.ok) {
      fetchList();
      if (detail?.id === a.id) setDetail({ ...detail, is_active: !a.is_active });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Duyurular</h1>
        <Link href="/dashboard/admin/duyurular/yeni">
          <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Duyuru
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {list.map((a) => (
            <Card
              key={a.id}
              className={cn(
                "overflow-hidden rounded-xl border-2 transition-all cursor-pointer hover:shadow-md",
                a.is_active ? "border-slate-200" : "border-slate-100 bg-slate-50/50"
              )}
              onClick={() => setDetail(a)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Megaphone className={cn("h-4 w-4 shrink-0", a.is_active ? "text-amber-500" : "text-slate-400")} />
                      <h3 className="font-semibold text-slate-900 truncate">{a.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                      {a.content || "—"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {(Array.isArray(a.target_roles) ? a.target_roles : []).map((r) => (
                        <span
                          key={r}
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                            ROLE_BADGE_COLORS[r] ?? "bg-slate-100 text-slate-600"
                          )}
                        >
                          {ROLE_LABELS[r] ?? r}
                        </span>
                      ))}
                      {a.target_bolge && (
                        <span className="text-xs text-slate-500">
                          · {regionToTurkish(a.target_bolge)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {formatDate(a.created_at)}
                      {" · "}
                      {a.target_roles?.length ?? 0} role gönderildi
                    </p>
                  </div>
                  <div
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant={a.is_active ? "outline" : "default"}
                      size="sm"
                      className={cn(
                        "rounded-lg",
                        !a.is_active && "bg-emerald-600 hover:bg-emerald-700"
                      )}
                      onClick={() => handleToggleActive(a)}
                      disabled={toggling === a.id}
                    >
                      {a.is_active ? "Pasif yap" : "Aktif yap"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {list.length === 0 && !loading && (
        <Card className="rounded-xl border-2 border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Henüz duyuru yok</p>
            <p className="text-sm text-slate-400 mt-1">İlk duyuruyu oluşturmak için Yeni Duyuru butonunu kullanın.</p>
            <Link href="/dashboard/admin/duyurular/yeni" className="mt-4">
              <Button variant="outline" className="rounded-xl">Yeni Duyuru</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-amber-500" />
              {detail?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-slate-600 text-sm mt-2 max-h-64 overflow-y-auto">
            {detail?.content || "—"}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {(Array.isArray(detail?.target_roles) ? detail?.target_roles : []).map((r) => (
              <span
                key={r}
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                  ROLE_BADGE_COLORS[r] ?? "bg-slate-100 text-slate-600"
                )}
              >
                {ROLE_LABELS[r] ?? r}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {detail?.created_at && formatDate(detail.created_at)}
            {" · "}
            {detail?.target_roles?.length ?? 0} role gönderildi
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
