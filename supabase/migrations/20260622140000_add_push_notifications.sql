-- Push notifications on job assignment + completion.
--
-- Mirrors notify_make_on_change (20260422184911): a SECURITY DEFINER trigger that
-- POSTs to the `send-push` edge function via pg_net. Never blocks the write.
--
-- One function serves all three job tables. It reads fields out of to_jsonb(NEW/OLD)
-- by key, so it works even where a column is absent (e.g. scheduled_filter_services
-- has no customer_name) — a missing key simply yields NULL.
--
-- Two GUCs must be configured for it to actually send (it skips with a warning if not):
--   app.send_push_url        – the send-push function URL
--   app.push_dispatch_secret – shared secret, must equal the function's PUSH_DISPATCH_SECRET env

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_push_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  func_url text := nullif(current_setting('app.send_push_url', true), '');
  secret   text := nullif(current_setting('app.push_dispatch_secret', true), '');
  new_row  jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  old_row  jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  new_tech text := new_row->>'technician_id';
  old_tech text := old_row->>'technician_id';
  new_comp text := new_row->>'completion_status';
  old_comp text := old_row->>'completion_status';
  who      text := COALESCE(new_row->>'customer_name', NULLIF(new_row->>'city', ''), 'לקוח');
  where_tx text := NULLIF(new_row->>'city', '');
  hdrs     jsonb;
  status_label text;
BEGIN
  IF func_url IS NULL THEN
    RAISE WARNING 'notify_push_on_change skipped: app.send_push_url not configured';
    RETURN COALESCE(NEW, OLD);
  END IF;
  hdrs := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', COALESCE(secret, ''));

  -- 1. Assignment → notify the assigned technician.
  IF new_tech IS NOT NULL AND new_tech IS DISTINCT FROM old_tech THEN
    PERFORM net.http_post(
      url := func_url,
      headers := hdrs,
      body := jsonb_build_object(
        'target', jsonb_build_object('technician_id', new_tech),
        'title', 'שובצה לך משימה חדשה',
        'body', who || COALESCE(' · ' || where_tx, ''),
        'url', '/technician'
      )
    );
  END IF;

  -- 2. Completion (any status) → notify managers.
  IF new_comp IS NOT NULL AND new_comp IS DISTINCT FROM old_comp THEN
    status_label := CASE new_comp
      WHEN 'done' THEN 'בוצע'
      WHEN 'not_done' THEN 'לא בוצע'
      WHEN 'need_return' THEN 'צריך לחזור'
      ELSE new_comp
    END;
    PERFORM net.http_post(
      url := func_url,
      headers := hdrs,
      body := jsonb_build_object(
        'target', jsonb_build_object('role', 'admin'),
        'title', 'דיווח טכנאי: ' || status_label,
        'body', who || COALESCE(' · ' || where_tx, ''),
        'url', '/work-schedule'
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Never block the write if the webhook fails.
  RAISE WARNING 'notify_push_on_change failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS notify_push_malfunctions ON public.malfunctions;
CREATE TRIGGER notify_push_malfunctions
  AFTER INSERT OR UPDATE ON public.malfunctions
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_change();

DROP TRIGGER IF EXISTS notify_push_installations ON public.installations;
CREATE TRIGGER notify_push_installations
  AFTER INSERT OR UPDATE ON public.installations
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_change();

DROP TRIGGER IF EXISTS notify_push_filter_services ON public.scheduled_filter_services;
CREATE TRIGGER notify_push_filter_services
  AFTER INSERT OR UPDATE ON public.scheduled_filter_services
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_change();
