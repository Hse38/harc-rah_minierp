import { createAdminClient } from "@/lib/supabase/admin";

const supabaseAdmin = createAdminClient();

export interface SendNotificationParams {
  recipientId: string;
  recipientRole: string;
  expenseId: string;
  message: string;
  pushTitle: string;
  pushBody: string;
  pushUrl: string;
}

export async function sendNotification({
  recipientId,
  recipientRole,
  expenseId,
  message,
  pushTitle,
  pushBody,
  pushUrl,
}: SendNotificationParams): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("notification_prefs")
    .eq("id", recipientId)
    .single();

  await supabaseAdmin.from("notifications").insert({
    recipient_id: recipientId,
    recipient_role: recipientRole,
    expense_id: expenseId,
    message,
    is_read: false,
  });

  const prefs = profile?.notification_prefs as { push_enabled?: boolean } | null | undefined;
  const pushEnabled = prefs?.push_enabled !== false;

  if (pushEnabled) {
    const { data: subRow, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", recipientId)
      .single();

    const sub = (subRow as { subscription?: unknown } | null)?.subscription;
    console.log("[sendNotification] Subscription:", { recipientId, sub: sub != null, subError: subError?.message });
    if (sub) {
      try {
        const webpush = await import("web-push");
        const vapidEmail = process.env.VAPID_EMAIL;
        const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
        if (vapidEmail && vapidPublic && vapidPrivate) {
          webpush.default.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
          const subscription = typeof sub === "string" ? JSON.parse(sub) : sub;
          await webpush.default.sendNotification(
            subscription,
            JSON.stringify({ title: pushTitle, body: pushBody, url: pushUrl })
          );
        }
      } catch (e) {
        console.error("Push gönderilemedi:", e);
      }
    } else {
      console.log("[sendNotification] Subscription bulunamadı, push gönderilemiyor:", recipientId);
    }
  }
}

export async function sendNotificationToRole(
  role: string,
  params: Omit<SendNotificationParams, "recipientId" | "recipientRole"> & { bolge?: string }
): Promise<void> {
  if (role === "koordinator") {
    console.log("Bölge onayı yapıldı, koordinatöre push gönderiliyor...");
  }

  let query = supabaseAdmin.from("profiles").select("id").eq("role", role);
  if (role === "bolge" && params.bolge) {
    query = query.eq("bolge", params.bolge);
  }
  const { data: users, error: queryError } = await query;

  if (role === "koordinator") {
    console.log("Koordinatör kullanıcılar:", users, queryError?.message ?? queryError);
  }

  const { bolge: _b, ...rest } = params;
  for (const user of users ?? []) {
    if (role === "koordinator") {
      console.log("Push gönderiliyor:", user.id);
    }
    await sendNotification({
      ...rest,
      recipientId: user.id,
      recipientRole: role,
    });
  }
}
