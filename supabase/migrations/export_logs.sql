CREATE TABLE IF NOT EXISTS export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  export_date timestamptz DEFAULT now(),
  start_date date,
  end_date date,
  record_count int
);

ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanıcı kendi export kayıtlarını görür"
  ON export_logs FOR SELECT TO authenticated
  USING (auth.uid() = exported_by);

CREATE POLICY "Kullanıcı kendi export kaydı ekleyebilir"
  ON export_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = exported_by);
