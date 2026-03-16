"use client";

import { useAnnouncements } from "@/contexts/AnnouncementsContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AnnouncementBanner() {
  const { unseen, openModal, modalAnnouncement, closeModal, markSeen } = useAnnouncements();
  const first = unseen[0];
  if (!first) return null;

  const handleCloseModal = () => {
    if (modalAnnouncement) markSeen(modalAnnouncement.id);
    closeModal();
  };

  return (
    <>
      <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 flex items-center justify-between gap-2 text-sm">
        <span className="text-amber-900 truncate">
          📢 Yeni duyuru: {first.title}
        </span>
        <button
          type="button"
          onClick={() => openModal(first)}
          className="shrink-0 font-medium text-amber-800 hover:underline"
        >
          Görüntüle →
        </button>
      </div>
      <Dialog open={!!modalAnnouncement} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{modalAnnouncement?.title}</DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-slate-600 text-sm mt-2">
            {modalAnnouncement?.content}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {modalAnnouncement?.created_at &&
              new Date(modalAnnouncement.created_at).toLocaleString("tr-TR")}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
