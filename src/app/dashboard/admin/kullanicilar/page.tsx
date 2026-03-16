"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REGION_LIMIT_SLUGS } from "@/lib/region-names";
import { regionToTurkish } from "@/lib/region-names";
import { Users, Plus, Pencil } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "all", label: "Tüm roller" },
  { value: "deneyap", label: "Deneyap" },
  { value: "il", label: "İl Sorumlusu" },
  { value: "bolge", label: "Bölge Sorumlusu" },
  { value: "koordinator", label: "Koordinatör" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "yk", label: "YK" },
  { value: "admin", label: "Admin" },
];

const ROLE_LABELS: Record<string, string> = {
  deneyap: "Deneyap",
  il: "İl",
  bolge: "Bölge",
  koordinator: "Koord.",
  muhasebe: "Muhasebe",
  yk: "YK",
  admin: "Admin",
};

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  il: string | null;
  bolge: string | null;
  last_sign_in_at: string | null;
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminKullanicilarPage() {
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("all");
  const [bolge, setBolge] = useState("all");
  const [q, setQ] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (role && role !== "all") params.set("role", role);
    if (bolge && bolge !== "all") params.set("bolge", bolge);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    if (res.ok) setList(Array.isArray(data) ? data : []);
    else setList([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [role, bolge]);

  const filteredList = q.trim()
    ? list.filter((u) =>
        (u.full_name + " " + (u.email ?? "")).toLowerCase().includes(q.trim().toLowerCase())
      )
    : list;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Kullanıcılar</h1>
        <Link href="/dashboard/admin/kullanicilar/yeni">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Kullanıcı
          </Button>
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bolge} onValueChange={setBolge}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Bölge" />
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
        <Input
          placeholder="Ad veya email ara..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
          className="max-w-[200px]"
        />
        <Button variant="secondary" onClick={fetchUsers}>
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
                  <th className="text-left p-3 font-medium text-slate-700">Ad Soyad</th>
                  <th className="text-left p-3 font-medium text-slate-700">Email</th>
                  <th className="text-left p-3 font-medium text-slate-700">Rol</th>
                  <th className="text-left p-3 font-medium text-slate-700">İl</th>
                  <th className="text-left p-3 font-medium text-slate-700">Bölge</th>
                  <th className="text-left p-3 font-medium text-slate-700">Son Giriş</th>
                  <th className="text-left p-3 font-medium text-slate-700">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{u.full_name || "—"}</td>
                    <td className="p-3 text-slate-600">{u.email || "—"}</td>
                    <td className="p-3">
                      <span className="text-xs font-medium text-slate-700">{ROLE_LABELS[u.role] ?? u.role}</span>
                    </td>
                    <td className="p-3 text-slate-600">{u.il || "—"}</td>
                    <td className="p-3 text-slate-600">{u.bolge ? regionToTurkish(u.bolge) : "—"}</td>
                    <td className="p-3 text-slate-500 text-xs">{formatDate(u.last_sign_in_at)}</td>
                    <td className="p-3">
                      <Link href={`/dashboard/admin/kullanicilar/${u.id}`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredList.length === 0 && (
          <div className="p-8 text-center text-slate-500">Kayıt bulunamadı.</div>
        )}
      </div>
    </div>
  );
}
