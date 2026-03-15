"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
import { ReceiptUploader } from "@/components/expenses/receipt-uploader";
import { AiAnalysisBox } from "@/components/expenses/ai-analysis-box";
import type { ExpenseType } from "@/types";
import type { ReceiptAnalysis } from "@/types";
import type { Profile } from "@/types";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { notifyApi } from "@/lib/notify-api";
import { PROFILE_FIELDS_FORM } from "@/lib/expense-fields";
import { formatCurrency } from "@/lib/utils";

const EXPENSE_TYPES: ExpenseType[] = [
  "Ulaşım",
  "Konaklama",
  "Yemek",
  "Malzeme",
  "Diğer",
];

export default function BolgeYeniPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState({
    iban: "",
    expense_type: "Diğer" as ExpenseType,
    amount: "",
    description: "",
  });

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select(PROFILE_FIELDS_FORM)
        .eq("id", user.id)
        .single();
      const pr = p as Profile | null;
      setProfile(pr ?? null);
      if (pr?.role !== "bolge") {
        router.replace("/dashboard/bolge");
        return;
      }
      setForm((f) => ({
        ...f,
        iban: pr?.iban ?? "",
      }));
      setLoading(false);
    })();
  }, [supabase, router]);

  function handleAnalysisResult(data: ReceiptAnalysis | null) {
    setAnalysis(data);
    setAnalyzing(false);
    if (data && !data.error) {
      if (data.tutar != null)
        setForm((f) => ({ ...f, amount: String(data.tutar) }));
      if (data.kategori)
        setForm((f) => ({ ...f, expense_type: data.kategori ?? f.expense_type }));
      if (data.aciklama)
        setForm((f) => ({ ...f, description: data.aciklama ?? "" }));
    }
  }

  function isDuplicateExpenseNumberError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const e = err as { code?: string; message?: string; details?: string };
    if (e.code === "23505") return true;
    const msg = String(e.message ?? e.details ?? "");
    return msg.includes("expenses_expense_number_key") || msg.includes("duplicate key");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!profile || Number.isNaN(amount) || amount <= 0) {
      toast.error("Tutar geçerli bir sayı olmalı.");
      return;
    }
    setSubmitting(true);
    const maxAttempts = 3;
    let lastError: unknown = null;
    let expenseNumber: string | null = null;

    try {
      const { getNextExpenseNumber } = await import("@/lib/expense-number");

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        lastError = null;
        const { data: lastRow } = await supabase
          .from("expenses")
          .select("expense_number")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        expenseNumber = await getNextExpenseNumber(
          async () => (lastRow as { expense_number: string } | null)?.expense_number ?? null
        );

        const { error: insertErr } = await supabase.from("expenses").insert({
          expense_number: expenseNumber,
          submitter_id: profile.id,
          submitter_name: profile.full_name,
          iban: form.iban || profile.iban || "",
          il: profile.il || "",
          bolge: profile.bolge || "",
          expense_type: form.expense_type,
          amount,
          description: form.description || "",
          receipt_url: receiptUrl || null,
          ai_analysis: analysis ? JSON.stringify(analysis) : null,
          status: "pending_koord",
        });

        if (insertErr) {
          lastError = insertErr;
          if (attempt < maxAttempts && isDuplicateExpenseNumberError(insertErr)) continue;
          throw insertErr;
        }

        const { data: inserted } = await supabase
          .from("expenses")
          .select("id")
          .eq("expense_number", expenseNumber)
          .single();
        const expenseId = (inserted as { id: string } | null)?.id;

        if (expenseId) {
          notifyApi({
            toRole: "koordinator",
            expenseId,
            message: `[${expenseNumber}] bölge sorumlusu tarafından açıldı, TÇK onayı bekliyor.`,
            pushTitle: "TAMGA - Yeni Harcama (bölge)",
            pushBody: `${profile.full_name} · ${expenseNumber} · ${formatCurrency(amount)}`,
            pushUrl: "/dashboard/koordinator",
          });
        }

        toast.success(`${expenseNumber} TÇK onayına gönderildi.`);
        window.location.href = "/dashboard/bolge";
        return;
      }

      if (lastError && isDuplicateExpenseNumberError(lastError)) {
        toast.error("Numara çakışması oluştu, lütfen tekrar deneyin.");
        return;
      }
      throw lastError;
    } catch (err: unknown) {
      if (isDuplicateExpenseNumberError(err)) {
        toast.error("Numara çakışması oluştu, lütfen tekrar deneyin.");
        return;
      }
      toast.error(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Kayıt oluşturulamadı."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile || profile.role !== "bolge") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/bolge">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold text-slate-800">Yeni Harcama (TÇK onayına)</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">1. ADIM — Fiş yükle</h2>
          <ReceiptUploader
            userId={profile.id}
            onUploaded={setReceiptUrl}
            onAnalysisStart={() => setAnalyzing(true)}
            onAnalysisResult={handleAnalysisResult}
            disabled={submitting}
          />
          {analyzing && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              <span>Fiş analiz ediliyor...</span>
            </div>
          )}
          {(analysis || receiptUrl) && !analyzing && (
            <AiAnalysisBox
              analysis={analysis}
              onUseManual={() => {
                setAnalysis(null);
                setReceiptUrl("");
              }}
            />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">2. ADIM — Kişi bilgileri</h2>
          <div className="space-y-2">
            <Label>Ad Soyad</Label>
            <Input value={profile.full_name} readOnly disabled className="bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={form.iban}
              onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">3. ADIM — Harcama bilgileri</h2>
          <p className="text-xs text-slate-500">Fiş yüklerseniz alanlar otomatik dolar; isterseniz elle değiştirebilirsiniz.</p>
          <div className="space-y-2">
            <Label htmlFor="expense_type">Tür</Label>
            <Select
              value={form.expense_type}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, expense_type: v as ExpenseType }))
              }
              disabled={submitting}
            >
              <SelectTrigger id="expense_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Tutar (₺)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0,00"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Kısa açıklama"
              rows={2}
              disabled={submitting}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? "Gönderiliyor..." : "TÇK onayına gönder"}
        </Button>
      </form>
    </div>
  );
}
