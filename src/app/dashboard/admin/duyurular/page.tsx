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

  const handleDeactivate = async (id: string) => {
    if (!confirm("Bu duyuruyu pasif yapmak istediğinize emin misiniz?")) return;
    setToggling(id);
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: false }),
    });
    setToggling(null);
    if (res.ok) fetchList();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Duyurular</h1>
        <Link href="/dashboard/admin/duyurular/yeni">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Duyuru
          </Button>
        </Link>
      </div>
      {loading ? (
        <div className="text-slate-500 py-8">Yükleniyor...</div>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => setDetail(a)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {Array.isArray(a.target_roles) ? a.target_roles.map((r) => ROLE_LABELS[r] ?? r).join(", ") : "—"}
                    {a.target_bolge ? ` · ${regionToTurkish(a.target_bolge)}` : ""}
                    {" · "}
                    {new Date(a.created_at).toLocaleDateString("tr-TR")}
                    {!a.is_active && " · Pasif"}
                  </p>
                </div>
                {a.is_active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeactivate(a.id);
                    }}
                    disabled={toggling === a.id}
                  >
                    Pasif yap
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {list.length === 0 && !loading && (
        <p className="text-slate-500 py-8">Henüz duyuru yok.</p>
      )}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-slate-600 text-sm mt-2">
            {detail?.content}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {detail?.created_at && new Date(detail.created_at).toLocaleString("tr-TR")}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
