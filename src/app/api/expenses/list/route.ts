import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EXPENSE_FIELDS_FULL } from "@/lib/expense-fields";
import type { ExpenseStatus } from "@/types";

type Cursor = { created_at: string; id: string };

function clampLimit(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function asString(v: string | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function asNumber(v: string | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseCsv(v: string | null): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const scope = asString(url.searchParams.get("scope")) ?? "me";
  const limit = clampLimit(Number(url.searchParams.get("limit") ?? 20), 1, 100);
  const cursorCreatedAt = asString(url.searchParams.get("cursorCreatedAt"));
  const cursorId = asString(url.searchParams.get("cursorId"));

  const statuses = parseCsv(url.searchParams.get("statuses")) as ExpenseStatus[];
  const expenseTypes = parseCsv(url.searchParams.get("types"));
  const q = asString(url.searchParams.get("q"));
  const filterBolge = asString(url.searchParams.get("bolge"));
  const filterIl = asString(url.searchParams.get("il"));
  const dateFrom = asString(url.searchParams.get("dateFrom"));
  const dateTo = asString(url.searchParams.get("dateTo"));
  const amountMin = asNumber(url.searchParams.get("amountMin"));
  const amountMax = asNumber(url.searchParams.get("amountMax"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,il,bolge")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { role?: string | null } | null)?.role ?? null;
  const il = (profile as { il?: string | null } | null)?.il ?? null;
  const bolge = (profile as { bolge?: string | null } | null)?.bolge ?? null;

  let query = supabase
    .from("expenses")
    .select(EXPENSE_FIELDS_FULL)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1); // fetch one extra to compute nextCursor

  // Scope base filter
  if (scope === "il") {
    if (!il) return NextResponse.json({ items: [], nextCursor: null });
    query = query.eq("il", il);
  } else if (scope === "bolge") {
    if (!bolge) return NextResponse.json({ items: [], nextCursor: null });
    query = query.eq("bolge", bolge);
  } else if (scope === "me") {
    query = query.eq("submitter_id", user.id);
  } else if (scope === "yk") {
    if (!["yk", "admin"].includes(String(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (scope === "muhasebe") {
    if (!["muhasebe", "admin"].includes(String(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (scope === "koordinator") {
    if (!["koordinator", "admin"].includes(String(role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Bad scope" }, { status: 400 });
  }

  // Filters
  if (statuses.length) query = query.in("status", statuses);
  if (expenseTypes.length) query = query.in("expense_type", expenseTypes);
  if (filterBolge) query = query.eq("bolge", filterBolge);
  if (filterIl) query = query.eq("il", filterIl);
  if (q) {
    // Search across common fields (no full-text index here)
    query = query.or(
      `expense_number.ilike.%${q}%,submitter_name.ilike.%${q}%,description.ilike.%${q}%`
    );
  }
  if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
  if (amountMin != null) query = query.gte("amount", amountMin);
  if (amountMax != null) query = query.lte("amount", amountMax);

  // Cursor paging
  if (cursorCreatedAt && cursorId) {
    // (created_at < cursorCreatedAt) OR (created_at = cursorCreatedAt AND id < cursorId)
    query = query.or(
      `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []) as { id: string; created_at: string }[];
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];

  const nextCursor: Cursor | null =
    hasMore && last ? { created_at: last.created_at, id: last.id } : null;

  return NextResponse.json({ items, nextCursor });
}

