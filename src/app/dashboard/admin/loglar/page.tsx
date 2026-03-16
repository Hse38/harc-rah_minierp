"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity } from "lucide-react";

type LogRow = {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  user_created: "bg-blue-100 text-blue-800",
  expense_approved: "bg-green-100 text-green-800",
  expense_rejected: "bg-red-100 text-red-800",
  admin_override: "bg-orange-100 text-orange-800",
  announcement_created: "bg-purple-100 text-purple-800",
  limit_updated: "bg-amber-100 text-amber-800",
  user_updated: "bg-slate-100 text-slate-800",
  password_reset: "bg-slate-100 text-slate-800",
  user_suspended: "bg-red-100 text-red-800",
  user_unsuspended: "bg-green-100 text-green-800",
  expense_deleted: "bg-red-100 text-red-800",
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

export default function AdminLoglarPage() {
  const [list, setList] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userQ, setUserQ] = useState("");
  const [actionQ, setActionQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailsModal, setDetailsModal] = useState<LogRow | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (userQ.trim()) params.set("user", userQ.trim());
    if (actionQ) params.set("action", actionQ);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/admin/logs?${params}`);
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const targetDisplay = (log: LogRow): string => {
    const d = log.details as { expense_number?: string } | null;
    if (d?.expense_number) return d.expense_number;
    return log.target_id?.slice(0, 8) ?? "—";
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Sistem Logları</h1>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Kullanıcı adı</Label>
          <Input
            placeholder="Ara..."
            value={userQ}
            onChange={(e) => setUserQ(e.target.value)}
            className="w-[140px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Aksiyon</Label>
          <Input
            placeholder="action"
            value={actionQ}
            onChange={(e) => setActionQ(e.target.value)}
            className="w-[140px]"
          />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px]" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px]" />
        <Button variant="secondary" onClick={fetchLogs}>
          Filtrele
        </Button>
      </div>
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-700">Kullanıcı</th>
                  <th className="text-left p-3 font-medium text-slate-700">Aksiyon</th>
                  <th className="text-left p-3 font-medium text-slate-700">Hedef</th>
                  <th className="text-left p-3 font-medium text-slate-700">Zaman</th>
                  <th className="text-left p-3 font-medium text-slate-700">Detay</th>
                </tr>
              </thead>
              <tbody>
                {list.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <span className="font-medium text-slate-900">{log.user_name || "—"}</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{targetDisplay(log)}</td>
                    <td className="p-3 text-slate-500 text-xs">{formatRelative(log.created_at)}</td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailsModal(log)}
                      >
                        JSON
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Dialog open={!!detailsModal} onOpenChange={() => setDetailsModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detaylar</DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-[300px]">
            {detailsModal?.details
              ? JSON.stringify(detailsModal.details, null, 2)
              : "—"}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
