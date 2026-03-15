-- region_limits: authenticated users can read (for dashboard/limit display)
ALTER TABLE region_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "region_limits_select_authenticated" ON region_limits;
CREATE POLICY "region_limits_select_authenticated" ON region_limits
  FOR SELECT
  TO authenticated
  USING (true);

-- Koordinatör/YK limit güncellemesi için: role koordinator veya yk ise update/insert (opsiyonel, uygulama service role kullanıyorsa gerekmez)
-- Bu migration sadece SELECT'i açar; update/insert mevcut RLS veya service role ile yapılıyorsa dokunmayın.
