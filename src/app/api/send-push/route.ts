import { NextResponse } from "next/server";
import webpush from "web-push";
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
    const body = (await request.json()) as {
      recipient_id?: string;
      recipient_role?: string;
      expense_id?: string;
      title: string;
      body: string;
      url?: string;
    };
    const { title, body, url = "/" } = body;
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const supabase = createAdminClient();
    let userIds: string[] = [];

    if (body.recipient_id) {
      userIds = [body.recipient_id];
    } else if (body.recipient_role) {
      if (body.expense_id && body.recipient_role === "bolge") {
        const { data: expense } = await supabase
          .from("expenses")
          .select("bolge")
          .eq("id", body.expense_id)
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
          .eq("role", body.recipient_role);
        userIds = (profiles ?? []).map((p: { id: string }) => p.id);
      }
    }

    if (userIds.length === 0) return NextResponse.json({ sent: 0 });

    const { data: rows } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", userIds);

    const payload = JSON.stringify({ title, body, url, tag: "harcirah" });
    let sent = 0;
    for (const row of rows ?? []) {
      const sub = (row as { subscription: unknown }).subscription;
      if (!sub || typeof sub !== "object") continue;
      try {
        await webpush.sendNotification(sub as webpush.PushSubscription, payload);
        sent++;
      } catch {
        // subscription expired/invalid, skip
      }
    }
    return NextResponse.json({ sent });
  } catch (e) {
    console.error("send-push", e);
    return NextResponse.json({ error: "Push send failed" }, { status: 500 });
  }
}
