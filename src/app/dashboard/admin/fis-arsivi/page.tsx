"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReceiptLightbox } from "@/components/expenses/receipt-lightbox";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileImage, Loader2 } from "lucide-react";
import Image from "next/image";

type ReceiptRow = {
  id: string;
  expense_number: string;
  submitter_id: string;
  submitter_name: string;
  receipt_url: string;
  created_at: string;
  amount: number;
  manuel_giris?: boolean;
  eski_fis?: boolean;
  fis_hash?: string | null;
};

export default function AdminFisArsiviPage() {
  const [list, setList] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ url: string } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/receipts");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ReceiptRow[]>();
    for (const r of list) {
      const key = `${r.submitter_name}__${r.submitter_id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([k, rows]) => ({
      key: k,
      userName: rows[0]?.submitter_name ?? "Kullanıcı",
      rows,
    }));
  }, [list]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Fiş Arşivi</h1>
        <p className="text-sm text-slate-600">
          Yüklenen tüm fişler kullanıcıya göre gruplanır.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-slate-600 font-medium">Fiş bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <Card key={g.key} className="rounded-2xl shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{g.userName}</p>
                    <p className="text-xs text-slate-500">{g.rows.length} fiş</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.rows.map((r) => {
                    const hashSuffix = r.fis_hash ? r.fis_hash.slice(-8) : "—";
                    return (
                      <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-slate-50">
                            <Image
                              src={r.receipt_url}
                              alt="Fiş"
                              width={64}
                              height={64}
                              className="h-16 w-16 object-cover"
                              sizes="64px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900">{r.expense_number}</span>
                              {r.manuel_giris && (
                                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[11px] font-medium">
                                  Manuel
                                </span>
                              )}
                              {r.eski_fis && (
                                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[11px] font-medium">
                                  Eski
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-700 mt-0.5">{formatCurrency(r.amount)}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatDate(r.created_at)} · hash: {hashSuffix}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setLightbox({ url: r.receipt_url })}
                          >
                            <FileImage className="h-4 w-4 mr-2" /> Fişi Gör
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {lightbox && (
        <ReceiptLightbox
          open={!!lightbox}
          onClose={() => setLightbox(null)}
          receiptUrl={lightbox.url}
          bolgeNote={null}
        />
      )}
    </div>
  );
}

