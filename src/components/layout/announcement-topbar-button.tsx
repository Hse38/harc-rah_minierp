"use client";

import { useAnnouncements } from "@/contexts/AnnouncementsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

export function AnnouncementTopbarButton() {
  const { unseenCount, unseen, openModal } = useAnnouncements();
  if (unseenCount === 0) return null;
  const first = unseen[0];
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => first && openModal(first)}
      aria-label="Duyurular"
    >
      <Megaphone className="h-5 w-5 text-amber-600" />
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
      >
        {unseenCount}
      </Badge>
    </Button>
  );
}
