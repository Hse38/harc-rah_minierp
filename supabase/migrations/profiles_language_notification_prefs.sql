-- Dil tercihi: tr | az | ky
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'tr'
  CHECK (language IN ('tr', 'az', 'ky'));

-- Bildirim tercihleri
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{
    "expense_approved": true,
    "expense_rejected": true,
    "expense_pending": true,
    "limit_warning": true
  }'::jsonb;
