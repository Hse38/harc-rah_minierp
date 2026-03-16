import { NextResponse } from "next/server";
import * as webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@t3vakfi.org",
    vapidPublic,
    vapidPrivate
  );
}

export async function POST(request: Request) {
  if (!vapidPrivate || !vapidPublic) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 });
  }
  try {
    const payload = (await request.json()) as {
      recipient_id?: string;
      recipient_role?: string;
      expense_id?: string;
      title: string;
      body: string;
      url?: string;
    };
    console.log("[send-push] incoming payload:", payload);
    const { title, body, url = "/" } = payload;
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const supabase = createAdminClient();
    let userIds: string[] = [];

    if (payload.recipient_id) {
      userIds = [payload.recipient_id];
    } else if (payload.recipient_role) {
      if (payload.expense_id && payload.recipient_role === "bolge") {
        const { data: expense } = await supabase
          .from("expenses")
          .select("bolge")
          .eq("id", payload.expense_id)
          .single();
        const bolge = (expense as { bolge?: string } | null)?.bolge;
        if (bolge) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "bolge")
            .eq("bolge", bolge);
          userIds = (profiles ?? []).map((p: { id: string }) => p.id);
        }
      }
      if (userIds.length === 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", payload.recipient_role);
        userIds = (profiles ?? []).map((p: { id: string }) => p.id);
      }
    }

    console.log("[send-push] userIds:", userIds);
    if (userIds.length === 0) {
      console.log("[send-push] no users to notify, exiting");
      return NextResponse.json({ sent: 0 });
    }

    const { data: rows, error: rowsError } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", userIds);

    console.log("[send-push] subscription rows:", rows?.length ?? 0, rowsError ?? null);

    const pushPayload = JSON.stringify({ title, body, url, tag: "tamga-notification" });
    let sent = 0;
    for (const row of rows ?? []) {
      const sub = (row as { subscription: unknown }).subscription;
      console.log("[send-push] sending to sub:", sub);
      if (!sub || typeof sub !== "object") continue;
      try {
        await webpush.sendNotification(sub as webpush.PushSubscription, pushPayload);
        sent++;
      } catch (err) {
        console.error("[send-push] webpush error:", err);
      }
    }
    console.log("[send-push] total sent:", sent);
    return NextResponse.json({ sent });
  } catch (e) {
    console.error("send-push", e);
    return NextResponse.json({ error: "Push send failed" }, { status: 500 });
  }
}
