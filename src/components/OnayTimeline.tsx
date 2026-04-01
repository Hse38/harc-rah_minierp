"use client";

import type { Expense } from "@/types";
import { formatDate } from "@/lib/utils";

type StepState = "done" | "waiting" | "rejected" | "future";

function getStateFor(step: "created" | "bolge" | "koord" | "paid", e: Expense): StepState {
  if (step === "created") return "done";

  const status = e.status;
  if (step === "bolge") {
    if (status === "rejected_bolge") return "rejected";
    if (["approved_bolge", "pending_koord", "approved_koord", "rejected_koord", "paid"].includes(status)) return "done";
    if (status === "pending_bolge") return "waiting";
    return "future";
  }
  if (step === "koord") {
    if (status === "rejected_koord") return "rejected";
    if (["approved_koord", "paid"].includes(status)) return "done";
    if (["pending_koord", "approved_bolge"].includes(status)) return "waiting";
    return "future";
  }
  // paid
  if (status === "paid") return "done";
  if (["approved_koord"].includes(status)) return "waiting";
  if (["rejected_bolge", "rejected_koord"].includes(status)) return "future";
  return "future";
}

function iconFor(state: StepState) {
  if (state === "done") return "✅";
  if (state === "waiting") return "⏳";
  if (state === "rejected") return "❌";
  return "⬜";
}

function colorFor(state: StepState) {
  if (state === "done") return "text-emerald-700";
  if (state === "waiting") return "text-amber-700";
  if (state === "rejected") return "text-red-700";
  return "text-slate-400";
}

export function OnayTimeline({ expense }: { expense: Expense }) {
  const steps: {
    key: "created" | "bolge" | "koord" | "paid";
    title: string;
    who?: string | null;
    at?: string | null;
    note?: string | null;
  }[] = [
    { key: "created", title: "Oluşturuldu", who: expense.submitter_name, at: expense.created_at, note: null },
    {
      key: "bolge",
      title: "Bölge Onayı",
      who: expense.reviewed_by_bolge ?? null,
      at: expense.reviewed_at_bolge ?? null,
      note: expense.status === "rejected_bolge" ? (expense.bolge_note ?? "Reddedildi") : null,
    },
    {
      key: "koord",
      title: "Koordinatör Onayı",
      who: expense.reviewed_by_koord ?? null,
      at: expense.reviewed_at_koord ?? null,
      note: expense.status === "rejected_koord" ? (expense.bolge_note ?? "Reddedildi") : null,
    },
    {
      key: "paid",
      title: "Ödeme",
      who: null,
      at: expense.status === "paid" ? expense.reviewed_at_koord ?? expense.created_at : null,
      note: null,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-800 mb-3">Onay Durumu</div>
      <ul className="space-y-3">
        {steps.map((s) => {
          const state = getStateFor(s.key, expense);
          return (
            <li key={s.key} className="flex items-start gap-3">
              <div className={"mt-0.5 " + colorFor(state)} aria-hidden>
                {iconFor(state)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={"font-medium " + colorFor(state)}>{s.title}</div>
                  <div className="text-xs text-slate-500">
                    {s.at ? formatDate(s.at) : state === "waiting" ? "Bekleniyor..." : "—"}
                  </div>
                </div>
                {s.who && <div className="text-xs text-slate-600 mt-0.5">{String(s.who)}</div>}
                {s.note && (
                  <div className="mt-1 text-xs text-red-700">
                    {s.note}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

