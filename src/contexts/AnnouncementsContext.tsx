"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type Announcement = { id: string; title: string; content: string; created_at: string };

type ContextValue = {
  announcements: Announcement[];
  unseen: Announcement[];
  readIds: Set<string>;
  unseenCount: number;
  markSeen: (id: string) => void;
  markAllSeen: () => void;
  openModal: (a: Announcement) => void;
  modalAnnouncement: Announcement | null;
  closeModal: () => void;
  refetch: () => void;
};

const AnnouncementsContext = createContext<ContextValue | null>(null);

export function AnnouncementsProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [modalAnnouncement, setModalAnnouncement] = useState<Announcement | null>(null);
  const supabase = createClient();

  const refetch = useCallback(async () => {
    const res = await fetch("/api/announcements");
    const data = await res.json();
    setAnnouncements(Array.isArray(data) ? data : []);
    if (userId) {
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", userId);
      const ids = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id));
      setReadIds(ids);
    }
  }, [userId, supabase]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("announcements-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        () => {
          refetch();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch, supabase]);

  const markSeen = useCallback(
    async (id: string) => {
      if (!userId) return;
      setReadIds((prev) => new Set(prev).add(id));
      await supabase.from("announcement_reads").upsert(
        { user_id: userId, announcement_id: id, read_at: new Date().toISOString() },
        { onConflict: "user_id,announcement_id" }
      );
    },
    [userId, supabase]
  );

  const markAllSeen = useCallback(async () => {
    if (!userId) return;
    const unread = announcements.filter((a) => !readIds.has(a.id));
    if (unread.length === 0) return;
    const newReads = new Set(readIds);
    unread.forEach((a) => newReads.add(a.id));
    setReadIds(newReads);
    await Promise.all(
      unread.map((a) =>
        supabase.from("announcement_reads").upsert(
          { user_id: userId, announcement_id: a.id, read_at: new Date().toISOString() },
          { onConflict: "user_id,announcement_id" }
        )
      )
    );
  }, [userId, announcements, readIds, supabase]);

  const unseenCount = announcements.filter((a) => !readIds.has(a.id)).length;

  const openModal = useCallback((a: Announcement) => setModalAnnouncement(a), []);
  const closeModal = useCallback(() => setModalAnnouncement(null), []);

  const unseen = announcements.filter((a) => !readIds.has(a.id));
  const value: ContextValue = {
    announcements,
    unseen,
    readIds,
    unseenCount,
    markSeen,
    markAllSeen,
    openModal,
    modalAnnouncement,
    closeModal,
    refetch,
  };

  return (
    <AnnouncementsContext.Provider value={value}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements(): ContextValue {
  const ctx = useContext(AnnouncementsContext);
  if (!ctx)
    return {
      announcements: [],
      unseen: [],
      readIds: new Set<string>(),
      unseenCount: 0,
      markSeen: () => {},
      markAllSeen: () => {},
      openModal: () => {},
      modalAnnouncement: null,
      closeModal: () => {},
      refetch: () => {},
    };
  return ctx;
}
