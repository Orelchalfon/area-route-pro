-- Add calendar completion status to ongoing_services.
-- Source of truth: Outlook calendar export sheets/calendar_fixed.csv — an event is
-- "done" when its קטגוריות column contains the tag 'בוצע'.
-- Populated by scripts/sync_calendar_status.mjs, which matches every ongoing_services
-- row on (service_date + leading customer name) and assigns a binary status.
ALTER TABLE public.ongoing_services
  ADD COLUMN IF NOT EXISTS category         TEXT,         -- raw tag, e.g. 'בוצע' (null when not done)
  ADD COLUMN IF NOT EXISTS is_done          BOOLEAN,      -- TRUE = שירות בוצע
  ADD COLUMN IF NOT EXISTS status_label     TEXT,         -- בוצע / לא בוצע
  ADD COLUMN IF NOT EXISTS status_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ongoing_services_match
  ON public.ongoing_services (service_date, task_description);
