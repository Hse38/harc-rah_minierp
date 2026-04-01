import { createAdminClient } from "@/lib/supabase/admin";

const supabaseAdmin = createAdminClient();

export interface SendNotificationParams {
  recipientId: string;
  recipientRole: string;
  expenseId?: string | null;
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

  const isSystem = expenseId == null || expenseId === "system";
  if (!isSystem) {
    await supabaseAdmin.from("notifications").insert({
      recipient_id: recipientId,
      recipient_role: recipientRole,
      expense_id: expenseId,
      message,
      is_read: false,
    });
  }

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
  params: Omit<SendNotificationParams, "recipientId" | "recipientRole"> & { expenseId?: string | null; bolge?: string }
): Promise<void> {
  console.log("[sendNotificationToRole] role:", role, "params:", params);

  let query = supabaseAdmin
    .from("profiles")
    .select("id, role, bolge, izin_modu, izin_vekil_id, izin_baslangic, izin_bitis")
    .eq("role", role);
  if (role === "bolge" && params.bolge) {
    query = query.eq("bolge", params.bolge);
  }
  const { data: users, error: queryError } = await query;
  console.log(
    "[sendNotificationToRole] users bulundu:",
    users,
    "hata:",
    queryError?.message ?? queryError
  );

  const { bolge: _b, ...rest } = params;
  console.log("[sendNotificationToRole] kullanıcı sayısı:", users?.length ?? 0);
  const now = new Date();
  const inRange = (start?: string | null, end?: string | null) => {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s && now < s) return false;
    if (e && now > e) return false;
    return true;
  };

  for (const user of (users ?? []) as any[]) {
    const isBolgeIzin = role === "bolge" && !!user?.izin_modu && inRange(user?.izin_baslangic ?? null, user?.izin_bitis ?? null);
    const vekilId = typeof user?.izin_vekil_id === "string" ? user.izin_vekil_id : null;
    const targetId = isBolgeIzin && vekilId ? vekilId : user.id;

    console.log("[sendNotificationToRole] push gönderiliyor kullanıcı:", { original: user.id, targetId, isBolgeIzin });
    await sendNotification({
      ...rest,
      recipientId: targetId,
      recipientRole: role,
    });

    // expense-side visibility (best-effort)
    if (isBolgeIzin && vekilId && rest.expenseId) {
      await supabaseAdmin
        .from("expenses")
        .update({
          bolge_warning: true,
          bolge_note: "Bölge sorumlusu izin modunda olduğu için vekile yönlendirildi.",
        })
        .eq("id", rest.expenseId);
    }
  }
}
