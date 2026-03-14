"use client";

import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense } from "@/types";

export type ExpenseRealtimeFilter =
  | { column: "submitter_id"; value: string }
  | { column: "bolge"; value: string }
  | null
  | undefined;

const STATUS_LABELS: Record<string, string> = {
  pending_bolge: "Bölge bekliyor",
  pending_koord: "TÇK bekliyor",
  approved_bolge: "Bölge onayı",
  approved_koord: "Onaylandı",
  paid: "Ödendi",
  rejected_bolge: "Reddedildi (Bölge)",
  rejected_koord: "Reddedildi (Koord)",
};

export function getExpenseStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function useExpensesRealtime(
  supabase: SupabaseClient,
  options: {
    filter: ExpenseRealtimeFilter;
    refetch: () => void | Promise<void>;
    onStatusChange?: (expense: Expense, previousStatus?: string) => void;
  }
): void {
  const { filter, refetch, onStatusChange } = options;

  useEffect(() => {
    if (filter === undefined) return;
    const channelName = "expenses-changes-" + (filter ? `${filter.column}-${filter.value}` : "all");
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        filter
          ? {
              event: "*",
              schema: "public",
              table: "expenses",
              filter: `${filter.column}=eq.${filter.value}`,
            }
          : {
              event: "*",
              schema: "public",
              table: "expenses",
            },
        (payload) => {
          const runRefetch = () => {
            void Promise.resolve(refetch());
          };
          if (payload.eventType === "UPDATE" && payload.new && onStatusChange) {
            const oldRow = payload.old as Record<string, unknown> | undefined;
            const newRow = payload.new as Expense;
            const oldStatus = oldRow?.status as string | undefined;
            if (oldStatus !== undefined && newRow.status !== oldStatus) {
              onStatusChange(newRow, oldStatus);
            }
          }
          runRefetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, filter === undefined ? null : filter?.column, filter === undefined ? null : filter?.value, refetch, onStatusChange]);
}
