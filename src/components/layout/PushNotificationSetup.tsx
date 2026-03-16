"use client";

import { useEffect } from "react";
import { registerPushNotifications } from "@/lib/push-notifications";

export function PushNotificationSetup({ userId }: { userId: string }) {
  useEffect(() => {
    const setup = async () => {
      const permission = Notification.permission;

      if (permission === "granted") {
        console.log("[PushNotificationSetup] permission granted, registering push for", userId);
        await registerPushNotifications(userId);
      } else if (permission === "default") {
        console.log("[PushNotificationSetup] permission default, requesting...");
        const result = await Notification.requestPermission();
        if (result === "granted") {
          console.log("[PushNotificationSetup] permission granted after prompt, registering push for", userId);
          await registerPushNotifications(userId);
        } else {
          console.log("[PushNotificationSetup] permission not granted:", result);
        }
      } else {
        console.log("[PushNotificationSetup] permission state:", permission);
      }
    };

    if (userId && typeof window !== "undefined" && "Notification" in window) {
      setup();
    }
  }, [userId]);

  return null;
}

