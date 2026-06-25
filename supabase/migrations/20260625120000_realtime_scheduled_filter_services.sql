-- Enable realtime for scheduled_filter_services so the manager board reflects a
-- technician's filter (שירות שוטף) completion the moment it's written.
--
-- Filter completions are persisted to scheduled_filter_services
-- (persistFilterServiceCompletion in src/hooks/useJobs.ts) and the manager subscribes via
-- useScheduledFilterServices, but the table was never added to the supabase_realtime
-- publication, so Postgres never emitted change events for it — unlike malfunctions /
-- installations / ongoing_services, which is why only those types updated live.
--
-- REPLICA IDENTITY FULL matches the other published job tables and, with RLS in place,
-- ensures UPDATE/DELETE events carry the full row for the subscriber's RLS check.

ALTER TABLE public.scheduled_filter_services REPLICA IDENTITY FULL;

-- ALTER PUBLICATION ... ADD TABLE errors if the table is already a member, so guard it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'scheduled_filter_services'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_filter_services;
  END IF;
END $$;
