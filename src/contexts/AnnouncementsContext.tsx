"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const SEEN_STORAGE_KEY = "seen_announcements";

type Announcement = { id: string; title: string; content: string; created_at: string };

type ContextValue = {
  announcements: Announcement[];
  unseenCount: number;
  unseen: Announcement[];
  markSeen: (id: string) => void;
  openModal: (a: Announcement) => void;
  modalAnnouncement: Announcement | null;
  closeModal: () => void;
  refetch: () => void;
};

const AnnouncementsContext = createContext<ContextValue | null>(null);

function getSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addSeenId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const seen = getSeenIds();
    if (seen.includes(id)) return;
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...seen, id]));
  } catch {}
}

export function AnnouncementsProvider({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [modalAnnouncement, setModalAnnouncement] = useState<Announcement | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/announcements");
    const data = await res.json();
    setAnnouncements(Array.isArray(data) ? data : []);
    setSeenIds(getSeenIds());
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const markSeen = useCallback((id: string) => {
    addSeenId(id);
    setSeenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const unseen = announcements.filter((a) => !seenIds.includes(a.id));
  const unseenCount = unseen.length;

  const openModal = useCallback((a: Announcement) => setModalAnnouncement(a), []);
  const closeModal = useCallback(() => setModalAnnouncement(null), []);

  const value: ContextValue = {
    announcements,
    unseenCount,
    unseen,
    markSeen,
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
      unseenCount: 0,
      unseen: [],
      markSeen: () => {},
      openModal: () => {},
      modalAnnouncement: null,
      closeModal: () => {},
      refetch: () => {},
    };
  return ctx;
}
