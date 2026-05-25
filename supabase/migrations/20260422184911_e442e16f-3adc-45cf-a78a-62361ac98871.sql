
-- Enable realtime on malfunctions and installations
ALTER TABLE public.malfunctions REPLICA IDENTITY FULL;
ALTER TABLE public.installations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'malfunctions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.malfunctions';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'installations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.installations';
  END IF;
END $$;

-- updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_malfunctions ON public.malfunctions;
CREATE TRIGGER set_updated_at_malfunctions
BEFORE UPDATE ON public.malfunctions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_installations ON public.installations;
CREATE TRIGGER set_updated_at_installations
BEFORE UPDATE ON public.installations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notify Make.com on changes via send-to-make edge function
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
    -- Skip if change came from sheet (avoid loops)
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
  -- Never block writes if the webhook fails
  RAISE WARNING 'notify_make_on_change failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DROP TRIGGER IF EXISTS notify_make_malfunctions ON public.malfunctions;
CREATE TRIGGER notify_make_malfunctions
AFTER INSERT OR UPDATE OR DELETE ON public.malfunctions
FOR EACH ROW EXECUTE FUNCTION public.notify_make_on_change();

DROP TRIGGER IF EXISTS notify_make_installations ON public.installations;
CREATE TRIGGER notify_make_installations
AFTER INSERT OR UPDATE OR DELETE ON public.installations
FOR EACH ROW EXECUTE FUNCTION public.notify_make_on_change();
