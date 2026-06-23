-- Extend ongoing_services so a "שירות שוטף" can be created as a real, schedulable
-- request from the app (the same way malfunctions/installations are): it carries the
-- customer it belongs to, a draft status, and the scheduling fields the board needs.
-- The table previously only held calendar-derived task rows (service_date +
-- task_description + completion status). App writes set source='app'.
ALTER TABLE public.ongoing_services
  ADD COLUMN IF NOT EXISTS customer_id        TEXT,
  ADD COLUMN IF NOT EXISTS customer_name      TEXT,
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS city               TEXT,
  ADD COLUMN IF NOT EXISTS address            TEXT,
  ADD COLUMN IF NOT EXISTS status             TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS priority           TEXT DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS technician_id      TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_date     DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time     TEXT,
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER,
  ADD COLUMN IF NOT EXISTS completion_status  TEXT,
  ADD COLUMN IF NOT EXISTS completion_notes   TEXT,
  ADD COLUMN IF NOT EXISTS completed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS source             TEXT DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT now();

-- Keep updated_at fresh on edits (reuses the shared trigger function).
DROP TRIGGER IF EXISTS set_updated_at_ongoing_services ON public.ongoing_services;
CREATE TRIGGER set_updated_at_ongoing_services
  BEFORE UPDATE ON public.ongoing_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime so newly created/scheduled requests appear without a manual refresh.
ALTER TABLE public.ongoing_services REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ongoing_services'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ongoing_services';
  END IF;
END $$;

-- RLS (read/insert/update/delete for authenticated) already exists from
-- 20260618001900_restrict_rls_to_authenticated.sql — no policy changes needed.
