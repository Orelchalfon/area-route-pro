-- Persist scheduled ongoing-service (filter) jobs.
--
-- Ongoing services on the schedule board are generated client-side from
-- customer.filterReplacementMonth (synthetic ids: filter-{year}-{month}-{customerId})
-- and, unlike malfunctions/installations, had no DB row. Scheduling one only lived
-- in React state, so it vanished on refresh. This table stores the scheduling decision
-- keyed by that synthetic id (job_key) so it can be reloaded.

CREATE TABLE public.scheduled_filter_services (
  id                 UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_key            TEXT NOT NULL UNIQUE,          -- filter-{year}-{month}-{customerId}
  customer_id        TEXT NOT NULL,
  scheduled_date     DATE NOT NULL,
  scheduled_time     TEXT,
  technician_id      TEXT,
  status             TEXT DEFAULT 'confirmed',
  completion_status  TEXT,
  completion_notes   TEXT,
  estimated_duration INTEGER,
  location           TEXT DEFAULT '',
  city               TEXT DEFAULT '',
  notes              TEXT DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_filter_services_date
  ON public.scheduled_filter_services (scheduled_date, technician_id);

ALTER TABLE public.scheduled_filter_services ENABLE ROW LEVEL SECURITY;

-- RLS mirrors the malfunctions/installations role model (see 20260618120000_role_based_access):
-- admins manage everything; employees may read the rows assigned to their technician id
-- (needed so the technician's daily route can show scheduled services).
CREATE POLICY "scheduled_filter_services admin all" ON public.scheduled_filter_services
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "scheduled_filter_services employee read own" ON public.scheduled_filter_services
  FOR SELECT TO authenticated
  USING (technician_id = public.current_technician_id());
