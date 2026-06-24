-- Let technicians report completion on filter (שירות שוטף) jobs.
--
-- Technician completion already works for malfunctions/installations (employee
-- update-own + the enforce_employee_job_update guard, see 20260618120000). The two
-- ongoing/filter sources were still closed to employees, so a technician's report on
-- those jobs was rejected at the DB and never reached the manager board:
--   * scheduled_filter_services had employee read-own but no update.
--   * ongoing_services was admin-only (no employee read or update).
-- This adds employee update-own (and, for ongoing_services, read-own) plus a
-- completion-only guard trigger per table, mirroring enforce_employee_job_update.
-- Admins and service-role writes (auth.uid() IS NULL) are unaffected.

-- 1. scheduled_filter_services -------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_employee_filter_service_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.job_key IS DISTINCT FROM OLD.job_key
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
       OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time
       OR NEW.technician_id IS DISTINCT FROM OLD.technician_id
       OR NEW.estimated_duration IS DISTINCT FROM OLD.estimated_duration
       OR NEW.location IS DISTINCT FROM OLD.location
       OR NEW.city IS DISTINCT FROM OLD.city
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Employees may only update completion fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_employee_update_filter_services
  BEFORE UPDATE ON public.scheduled_filter_services
  FOR EACH ROW EXECUTE FUNCTION public.enforce_employee_filter_service_update();

CREATE POLICY "scheduled_filter_services employee update own" ON public.scheduled_filter_services
  FOR UPDATE TO authenticated
  USING (technician_id = public.current_technician_id())
  WITH CHECK (technician_id = public.current_technician_id());

-- 2. ongoing_services ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_employee_ongoing_service_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.service_date IS DISTINCT FROM OLD.service_date
       OR NEW.task_description IS DISTINCT FROM OLD.task_description
       OR NEW.location IS DISTINCT FROM OLD.location
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.city IS DISTINCT FROM OLD.city
       OR NEW.address IS DISTINCT FROM OLD.address
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.technician_id IS DISTINCT FROM OLD.technician_id
       OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
       OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time
       OR NEW.estimated_duration IS DISTINCT FROM OLD.estimated_duration
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Employees may only update completion fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_employee_update_ongoing_services
  BEFORE UPDATE ON public.ongoing_services
  FOR EACH ROW EXECUTE FUNCTION public.enforce_employee_ongoing_service_update();

CREATE POLICY "ongoing_services employee read own" ON public.ongoing_services
  FOR SELECT TO authenticated
  USING (technician_id = public.current_technician_id());

CREATE POLICY "ongoing_services employee update own" ON public.ongoing_services
  FOR UPDATE TO authenticated
  USING (technician_id = public.current_technician_id())
  WITH CHECK (technician_id = public.current_technician_id());
