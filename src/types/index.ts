export type Role =
  | "deneyap"
  | "il"
  | "bolge"
  | "koordinator"
  | "muhasebe"
  | "yk";

export type ExpenseStatus =
  | "pending_bolge"
  | "pending_koord"   /* bölge sorumlusu açtı, TÇK onayı bekliyor */
  | "approved_bolge"
  | "rejected_bolge"
  | "approved_koord"
  | "rejected_koord"
  | "paid";

export type ExpenseType =
  | "Ulaşım"
  | "Konaklama"
  | "Yemek"
  | "Malzeme"
  | "Diğer";

export type ProfileLanguage = "tr" | "az" | "ky";

export interface NotificationPrefs {
  expense_approved: boolean;
  expense_rejected: boolean;
  expense_pending: boolean;
  limit_warning: boolean;
  push_enabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  expense_approved: true,
  expense_rejected: true,
  expense_pending: true,
  limit_warning: true,
  push_enabled: true,
};

export interface Profile {
  id: string;
  full_name: string;
  iban: string | null;
  role: Role;
  il: string | null;
  bolge: string | null;
  phone: string | null;
  created_at: string;
  language?: ProfileLanguage | null;
  notification_prefs?: NotificationPrefs | null;
}

export interface Expense {
  id: string;
  expense_number: string;
  submitter_id: string;
  submitter_name: string;
  iban: string;
  il: string;
  bolge: string;
  expense_type: ExpenseType;
  amount: number;
  description: string;
  receipt_url: string | null;
  ai_analysis: string | null;
  status: ExpenseStatus;
  bolge_note: string | null;
  bolge_warning: boolean;
  reviewed_by_bolge: string | null;
  reviewed_by_koord: string | null;
  reviewed_at_bolge: string | null;
  reviewed_at_koord: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_role?: string;
  recipient_id: string | null;
  expense_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ReceiptAnalysis {
  tutar?: number;
  tarih?: string;
  isletme?: string;
  kategori?: ExpenseType;
  aciklama?: string;
  error?: string;
  raw?: string;
}
