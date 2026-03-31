"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import TurkiyeHaritasi from "@/components/dashboard/TurkiyeHaritasi";
import { Users, FileText, Clock, Calendar, Megaphone, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getUserFriendlyApiErrorMessage, getUserFriendlyErrorMessage } from "@/lib/errorMessages";

type Stats = {
  totalUsers: number;
  roleCounts: Record<string, number>;
  totalExpense: number;
  pendingApproval: number;
  thisMonthExpenseCount: number;
  thisMonthExpenseAmount: number;
  activeAnnouncements: number;
  logsLast24h: number;
  recentLogs: { id: string; user_name: string; action: string; created_at: string }[];
};

const ROLE_LABELS: Record<string, string> = {
  deneyap: "Deneyap",
  il: "İl",
  bolge: "Bölge",
  koordinator: "Koord.",
  muhasebe: "Muhasebe",
  yk: "YK",
  admin: "Admin",
};

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "Az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return d.toLocaleDateString("tr-TR");
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(getUserFriendlyApiErrorMessage(j, "Veri yüklenemedi"));
          return;
        }
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(getUserFriendlyErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-slate-500">Yükleniyor...</p>
      </div>
    );
  }
  if (error || !stats) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-red-700">{error ?? "Veri alınamadı"}</p>
      </div>
    );
  }

  const roleSummary = Object.entries(stats.roleCounts)
    .map(([r, c]) => `${ROLE_LABELS[r] ?? r}: ${c}`)
    .join(", ");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Toplam kullanıcı"
          value={stats.totalUsers}
          subtitle={roleSummary}
          borderColor="primary"
        />
        <MetricCard
          title="Toplam harcama (₺)"
          value={formatCurrency(stats.totalExpense)}
          borderColor="neutral"
        />
        <MetricCard
          title="Bekleyen onay"
          value={stats.pendingApproval}
          borderColor="warning"
        />
        <MetricCard
          title="Bu ay harcama (adet)"
          value={stats.thisMonthExpenseCount}
          subtitle={`${formatCurrency(stats.thisMonthExpenseAmount)} tutar`}
          borderColor="primary"
        />
        <MetricCard
          title="Aktif duyuru"
          value={stats.activeAnnouncements}
          borderColor="purple"
        />
        <MetricCard
          title="Son 24 saat log"
          value={stats.logsLast24h}
          borderColor="neutral"
        />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4">Türkiye Harcama Haritası</h2>
        <TurkiyeHaritasi dataSource="admin" />
      </div>
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Son aktiviteler
          </h2>
        </CardHeader>
        <CardContent>
          {stats.recentLogs.length === 0 ? (
            <p className="text-slate-500 text-sm">Henüz log yok.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0 text-sm"
                >
                  <span className="font-medium text-slate-700">{log.user_name}</span>
                  <span className="text-slate-600">{log.action}</span>
                  <span className="text-slate-400 text-xs">{formatRelative(log.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
