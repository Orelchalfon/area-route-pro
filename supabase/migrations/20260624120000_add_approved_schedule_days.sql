-- Persist per-day schedule approval.
--
-- On the monthly board a manager "approves" a day (the green check / "messages sent"
-- state). That approval only lived in React state (a local Set in MonthlyScheduleBoard),
-- so it vanished on refresh and was not shared between managers. This table stores the
-- approval decision keyed by (technician_id, service_date) so it reloads and stays in
-- sync across the shared admin board — mirroring the scheduled_filter_services pattern
-- (see 20260622120000_add_scheduled_filter_services).

CREATE TABLE public.approved_schedule_days (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id TEXT NOT NULL,                 -- app technician id ('t1','t2')
  service_date  DATE NOT NULL,
  approved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (technician_id, service_date)
);

CREATE INDEX idx_approved_schedule_days_date
  ON public.approved_schedule_days (service_date, technician_id);

ALTER TABLE public.approved_schedule_days ENABLE ROW LEVEL SECURITY;

-- RLS mirrors the role model (see 20260618120000_role_based_access): admins manage
-- everything; employees may read the approvals for their own technician id (so a
-- technician's daily route can tell whether its day was approved).
CREATE POLICY "approved_schedule_days admin all" ON public.approved_schedule_days
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "approved_schedule_days employee read own" ON public.approved_schedule_days
  FOR SELECT TO authenticated
  USING (technician_id = public.current_technician_id());

-- Realtime so an approval on one manager's board appears on another's without a reload.
ALTER TABLE public.approved_schedule_days REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'approved_schedule_days'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.approved_schedule_days';
  END IF;
END $$;
