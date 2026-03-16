-- Duyuru okundu takibi
CREATE TABLE IF NOT EXISTS announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

CREATE INDEX IF NOT EXISTS announcement_reads_user_id_idx ON announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS announcement_reads_announcement_id_idx ON announcement_reads(announcement_id);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own announcement_reads"
  ON announcement_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own announcement_reads"
  ON announcement_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);
