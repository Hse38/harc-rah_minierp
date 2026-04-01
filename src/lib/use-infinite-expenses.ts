"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Cursor = { created_at: string; id: string } | null;

type ListResponse<T> = { items: T[]; nextCursor: Cursor };

export type InfiniteExpensesParams = {
  scope: "me" | "il" | "bolge" | "yk" | "muhasebe" | "koordinator";
  bolge?: string | null;
  il?: string | null;
  statuses?: string[];
  types?: string[];
  q?: string;
  dateFrom?: string; // yyyy-mm-dd
  dateTo?: string; // yyyy-mm-dd
  amountMin?: number | null;
  amountMax?: number | null;
  limit?: number;
};

function toCsv(v?: string[]) {
  return (v ?? []).filter(Boolean).join(",");
}

export function useInfiniteExpenses<T extends { id: string; created_at: string }>(
  params: InfiniteExpensesParams
) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => JSON.stringify({ ...params, limit: params.limit ?? 20 }), [params]);
  const keyRef = useRef(key);
  keyRef.current = key;

  const buildUrl = useCallback(
    (c: Cursor) => {
      const sp = new URLSearchParams();
      sp.set("scope", params.scope);
      sp.set("limit", String(params.limit ?? 20));
      const statuses = toCsv(params.statuses);
      const types = toCsv(params.types);
      if (statuses) sp.set("statuses", statuses);
      if (types) sp.set("types", types);
      if (params.bolge) sp.set("bolge", params.bolge);
      if (params.il) sp.set("il", params.il);
      if (params.q) sp.set("q", params.q);
      if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
      if (params.dateTo) sp.set("dateTo", params.dateTo);
      if (params.amountMin != null) sp.set("amountMin", String(params.amountMin));
      if (params.amountMax != null) sp.set("amountMax", String(params.amountMax));
      if (c) {
        sp.set("cursorCreatedAt", c.created_at);
        sp.set("cursorId", c.id);
      }
      return `/api/expenses/list?${sp.toString()}`;
    },
    [params]
  );

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCursor(null);
    try {
      const res = await fetch(buildUrl(null));
      const json = (await res.json().catch(() => ({}))) as Partial<ListResponse<T>> & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Veri yüklenemedi.");
      setItems(Array.isArray(json.items) ? (json.items as T[]) : []);
      setCursor((json.nextCursor as Cursor) ?? null);
    } catch (e) {
      setItems([]);
      setCursor(null);
      setError(e instanceof Error ? e.message : "Veri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(cursor));
      const json = (await res.json().catch(() => ({}))) as Partial<ListResponse<T>> & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Veri yüklenemedi.");
      const nextItems = Array.isArray(json.items) ? (json.items as T[]) : [];
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const merged = [...prev];
        for (const it of nextItems) if (!seen.has(it.id)) merged.push(it);
        return merged;
      });
      setCursor((json.nextCursor as Cursor) ?? null);
    } catch {
      // keep existing items
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, cursor, loadingMore]);

  useEffect(() => {
    loadFirstPage();
  }, [key, loadFirstPage]);

  return {
    items,
    cursor,
    hasMore: !!cursor,
    loading,
    loadingMore,
    error,
    reload: loadFirstPage,
    loadMore,
  };
}

