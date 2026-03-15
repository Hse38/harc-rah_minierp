"use client";

import { createBrowserClient } from "@supabase/ssr";

export async function registerPushNotifications(userId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push notifications desteklenmiyor");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("Service worker kayıt oldu:", registration);

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Push notification izni reddedildi");
      return false;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ) as BufferSource,
    });

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        subscription: JSON.parse(JSON.stringify(subscription)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    console.log("Push subscription kaydedildi");
    return true;
  } catch (error) {
    console.error("Push notification hatası:", error);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator && !!VAPID_PUBLIC;
}

export type SendPushPayload = {
  recipient_id?: string;
  recipient_role?: string;
  expense_id?: string;
  title: string;
  body: string;
  url?: string;
};

export async function sendPushFromClient(payload: SendPushPayload): Promise<void> {
  try {
    await fetch("/api/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore
  }
}
