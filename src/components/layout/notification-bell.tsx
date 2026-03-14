"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types";
import { toast } from "sonner";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ROUTES: Record<string, string> = {
  deneyap: "/dashboard/deneyap",
  il: "/dashboard/il",
  bolge: "/dashboard/bolge",
  koordinator: "/dashboard/koordinator",
  muhasebe: "/dashboard/muhasebe",
  yk: "/dashboard/yk",
};

export function NotificationBell({
  userId,
  userRole,
}: {
  userId: string;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .or(`recipient_id.eq.${userId},recipient_role.eq.${userRole}`)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications((data as Notification[]) || []);
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false)
        .or(`recipient_id.eq.${userId},recipient_role.eq.${userRole}`);
      setUnreadCount(count ?? 0);
    };
    fetchInitial();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new && (payload.new as { recipient_id?: string }).recipient_id === userId) {
            const row = payload.new as { message?: string };
            if (row.message) toast.info(row.message, { position: "bottom-right" });
          }
          fetchInitial();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_role=eq.${userRole}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const row = payload.new as { message?: string };
            if (row.message) toast.info(row.message, { position: "bottom-right" });
          }
          fetchInitial();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userRole, supabase]);

  const markAsRead = async (id: string, expenseId: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    setOpen(false);
    const base = ROUTES[userRole] ?? "/dashboard/deneyap";
    router.push(`${base}?highlight=${expenseId}`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-[380px]">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-3">
          <SheetTitle className="text-left">Bildirimler</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label="Kapat">
              <X className="h-5 w-5" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">Bildirim yok.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => markAsRead(n.id, n.expense_id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                  n.is_read
                    ? "border-slate-100 bg-white text-slate-600"
                    : "border-slate-200 bg-slate-50 font-medium text-slate-900"
                )}
              >
                <p className="line-clamp-2">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDate(n.created_at)}
                </p>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
