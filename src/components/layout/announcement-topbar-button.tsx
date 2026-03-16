"use client";

import { useState } from "react";
import { useAnnouncements } from "@/contexts/AnnouncementsContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Megaphone, X } from "lucide-react";
import { formatRelativeDate, cn } from "@/lib/utils";

export function AnnouncementTopbarButton() {
  const {
    announcements,
    readIds,
    unseenCount,
    markSeen,
    markAllSeen,
  } = useAnnouncements();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Duyurular"
        >
          <Megaphone className="h-5 w-5 text-amber-600" />
          {unseenCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-[380px]">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-3">
          <SheetTitle className="text-left">Duyurular</SheetTitle>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2">
          {unseenCount > 0 && announcements.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={markAllSeen}
            >
              Tümünü okundu işaretle
            </Button>
          )}
          <div className="space-y-1">
            {announcements.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">Henüz duyuru yok.</p>
            ) : (
              announcements.map((a) => {
                const isRead = readIds.has(a.id);
                const isExpanded = expandedId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      if (!isRead) markSeen(a.id);
                      setExpandedId(isExpanded ? null : a.id);
                    }}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                      "border-slate-100 bg-white",
                      !isRead && "border-l-4 border-l-blue-500"
                    )}
                  >
                    <p className="font-semibold text-slate-900">{a.title}</p>
                    <p
                      className={cn(
                        "mt-1 text-slate-600",
                        !isExpanded && "line-clamp-3"
                      )}
                    >
                      {a.content}
                    </p>
                    {a.content.length > 120 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : a.id);
                        }}
                        className="mt-1 text-xs font-medium text-blue-600 hover:underline"
                      >
                        {isExpanded ? "Daha az göster" : "Devamını oku"}
                      </button>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {formatRelativeDate(a.created_at)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
