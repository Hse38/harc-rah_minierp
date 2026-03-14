-- Push subscriptions for Web Push (run in Supabase SQL Editor if not using migrations)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcı kendi subscription'ını yönetir" ON push_subscriptions;
CREATE POLICY "Kullanıcı kendi subscription'ını yönetir"
  ON push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role / API to read for sending push (server-side uses createAdminClient)
-- If your send-push runs as service role, no extra policy needed for reading.
