"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { registerPushNotifications, isPushSupported } from "@/lib/push-notifications";
import { X } from "lucide-react";
import { toast } from "sonner";

const DISMISS_KEY = "pushBannerDismissedUntil";
const PUSH_ASKED_KEY = "push-asked";
const DISMISS_DAYS = 7;

export function PushPermissionBanner({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const askPushPermission = async () => {
      const alreadyAsked = localStorage.getItem(PUSH_ASKED_KEY);
      if (!alreadyAsked && userId && isPushSupported()) {
        const success = await registerPushNotifications(userId);
        localStorage.setItem(PUSH_ASKED_KEY, "true");
        if (success) {
          toast.success("Bildirimler aktif edildi!");
        }
      }
    };
    askPushPermission();
  }, [userId]);

  useEffect(() => {
    if (!isPushSupported() || typeof window === "undefined") return;
    if (Notification.permission === "granted") return;
    const until = localStorage.getItem(DISMISS_KEY);
    if (until && Date.now() < Number(until)) return;
    setVisible(true);
  }, []);

  async function handleAllow() {
    setLoading(true);
    const ok = await registerPushNotifications(userId);
    setLoading(false);
    if (ok) {
      setVisible(false);
      toast.success("Bildirimler aktif edildi!");
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mx-4 mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm text-blue-900">
          Bildirimler için izin verin, onay gelince haberdar olun.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-blue-600 hover:bg-blue-100"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={handleAllow} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? "İşleniyor..." : "İzin Ver"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleDismiss}>
          Şimdi değil
        </Button>
      </div>
    </div>
  );
}
