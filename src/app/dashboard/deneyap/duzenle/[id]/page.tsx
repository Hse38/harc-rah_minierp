"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import type { Expense } from "@/types";
import { toast } from "sonner";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { sendPushFromClient } from "@/lib/push-notifications";
import { getRecipientIds } from "@/lib/notification-recipients";
import { EXPENSE_FIELDS_FULL, PROFILE_FIELDS_FORM } from "@/lib/expense-fields";

const EXPENSE_TYPES: ExpenseType[] = [
  "Ulaşım",
  "Konaklama",
  "Yemek",
  "Malzeme",
  "Diğer",
];

export default function DeneyapDuzenlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
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

  const isResend =
    expense?.status === "rejected_bolge" || expense?.status === "rejected_koord";
  const rejectionReason =
    expense?.status === "rejected_bolge" && expense?.bolge_note
      ? expense.bolge_note
      : expense?.status === "rejected_koord"
        ? "Koordinatör tarafından reddedildi."
        : null;

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
      setProfile(p as Profile | null);

      const { data: ex, error } = await supabase
        .from("expenses")
        .select(EXPENSE_FIELDS_FULL)
        .eq("id", id)
        .eq("submitter_id", user.id)
        .single();
      if (error || !ex) {
        toast.error("Harcama bulunamadı.");
        router.push("/dashboard/deneyap");
        setLoading(false);
        return;
      }
      const e = ex as Expense;
      const allowed = ["pending_bolge", "rejected_bolge", "rejected_koord"].includes(e.status);
      if (!allowed) {
        toast.error("Bu harcama düzenlenemez.");
        router.push("/dashboard/deneyap");
        setLoading(false);
        return;
      }
      setExpense(e);
      setReceiptUrl(e.receipt_url ?? "");
      if (e.ai_analysis) {
        try {
          setAnalysis(JSON.parse(e.ai_analysis) as ReceiptAnalysis);
        } catch {
          setAnalysis(null);
        }
      } else setAnalysis(null);
      setForm({
        iban: e.iban ?? "",
        expense_type: (e.expense_type as ExpenseType) ?? "Diğer",
        amount: String(e.amount ?? ""),
        description: e.description ?? "",
      });
      setLoading(false);
    })();
  }, [id, supabase, router]);

  function handleAnalysisResult(data: ReceiptAnalysis | null) {
    setAnalysis(data);
    setAnalyzing(false);
    if (data && !data.error) {
      if (data.tutar != null) setForm((f) => ({ ...f, amount: String(data.tutar) }));
      if (data.kategori)
        setForm((f) => ({ ...f, expense_type: data.kategori ?? f.expense_type }));
      if (data.aciklama) setForm((f) => ({ ...f, description: data.aciklama ?? "" }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!profile || !expense || Number.isNaN(amount) || amount <= 0) {
      toast.error("Tutar geçerli bir sayı olmalı.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        iban: form.iban || profile.iban || "",
        expense_type: form.expense_type,
        amount,
        description: form.description || "",
        receipt_url: receiptUrl || null,
        ai_analysis: analysis ? JSON.stringify(analysis) : null,
      };

      if (isResend) {
        await supabase
          .from("expenses")
          .update({
            ...payload,
            status: "pending_bolge",
            bolge_note: null,
            bolge_warning: false,
            reviewed_by_bolge: null,
            reviewed_at_bolge: null,
            reviewed_by_koord: null,
            reviewed_at_koord: null,
          })
          .eq("id", expense.id);
        if (expense.bolge) {
          const bolgeRecipientIds = await getRecipientIds(supabase, { role: "bolge", bolge: expense.bolge });
          if (bolgeRecipientIds.length > 0) {
            await supabase.from("notifications").insert(
              bolgeRecipientIds.map((recipient_id) => ({
                recipient_id,
                recipient_role: "bolge",
                message: `[${expense.expense_number}] tekrar gönderildi, bölge onayı bekleniyor.`,
                expense_id: expense.id,
              }))
            );
          }
        }
        sendPushFromClient({
          recipient_role: "bolge",
          expense_id: expense.id,
          title: "Harcama tekrar gönderildi",
          body: `${expense.expense_number} bölge onayı bekliyor`,
          url: "/dashboard/bolge",
        });
        toast.success(
          `${expense.expense_number} tekrar gönderildi, bölge onayı bekleniyor.`
        );
      } else {
        await supabase.from("expenses").update(payload).eq("id", expense.id);
        toast.success("Harcama güncellendi.");
      }
      router.push("/dashboard/deneyap");
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Kayıt güncellenemedi."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !expense) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
        Profil bulunamadı.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/deneyap">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold text-slate-800">
          {isResend ? "Düzeltip tekrar gönder" : "Harcamayı düzenle"}
        </h1>
      </div>

      {rejectionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">Reddetme nedeni</p>
            <p className="text-sm text-red-700 mt-0.5">{rejectionReason}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Fiş</h2>
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
          <h2 className="text-sm font-semibold text-slate-800">Kişi bilgileri</h2>
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
          <h2 className="text-sm font-semibold text-slate-800">Harcama bilgileri</h2>
          <div className="space-y-2">
            <Label>Tür</Label>
            <Select
              value={form.expense_type}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, expense_type: v as ExpenseType }))
              }
              disabled={submitting}
            >
              <SelectTrigger>
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

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting
            ? "Kaydediliyor..."
            : isResend
              ? "Tekrar gönder"
              : "Kaydet"}
        </Button>
      </form>
    </div>
  );
}
