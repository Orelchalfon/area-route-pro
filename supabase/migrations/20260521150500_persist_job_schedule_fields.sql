-- Persist app scheduling/completion fields for Sheet-backed jobs.
ALTER TABLE public.malfunctions
  ADD COLUMN IF NOT EXISTS technician_id TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT,
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER,
  ADD COLUMN IF NOT EXISTS completion_status TEXT,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.installations
  ADD COLUMN IF NOT EXISTS technician_id TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT,
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER,
  ADD COLUMN IF NOT EXISTS completion_status TEXT,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_malfunctions_schedule ON public.malfunctions(scheduled_date, technician_id);
CREATE INDEX IF NOT EXISTS idx_installations_schedule ON public.installations(scheduled_date, technician_id);

-- Replace the previous project-hard-coded webhook URL with a configurable setting.
-- Configure in SQL once per environment, for example:
--   ALTER DATABASE postgres SET app.send_to_make_url = 'https://<project>.supabase.co/functions/v1/send-to-make';
CREATE OR REPLACE FUNCTION public.notify_make_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  func_url text := nullif(current_setting('app.send_to_make_url', true), '');
  row_data jsonb;
BEGIN
  IF func_url IS NULL THEN
    RAISE WARNING 'notify_make_on_change skipped: app.send_to_make_url is not configured';
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF (TG_OP = 'DELETE') THEN
    row_data := to_jsonb(OLD);
  ELSE
    row_data := to_jsonb(NEW);
    -- Skip changes that originated from Sheets/Make to avoid loops.
    IF row_data->>'source' = 'sheets' THEN
      RETURN NEW;
    END IF;
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_data END,
    'old_record', CASE WHEN TG_OP = 'DELETE' THEN row_data ELSE NULL END
  );

  PERFORM net.http_post(
    url := func_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := payload
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_make_on_change failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;
