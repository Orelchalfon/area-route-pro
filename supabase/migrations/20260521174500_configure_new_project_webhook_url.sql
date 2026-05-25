-- Wire database change triggers to this Supabase project's send-to-make function.
-- Supabase-hosted projects do not allow the CLI migration role to ALTER DATABASE
-- custom settings, so keep the value overrideable while providing a project default.
CREATE OR REPLACE FUNCTION public.notify_make_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  func_url text := COALESCE(
    nullif(current_setting('app.send_to_make_url', true), ''),
    'https://pmiglnfoalieflbzxtfa.supabase.co/functions/v1/send-to-make'
  );
  row_data jsonb;
BEGIN
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
