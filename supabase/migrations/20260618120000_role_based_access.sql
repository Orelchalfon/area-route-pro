-- Role-based access for employee subusers.
--
-- Before this migration every authenticated user had full CRUD on every table
-- (policies were `USING (true)`), i.e. everyone was effectively an admin.
-- This introduces two roles via a `profiles` table:
--   * admin    – the business owner; full access (unchanged behaviour).
--   * employee – a technician/subuser who may only SEE their own assigned jobs
--                and may only UPDATE the completion fields of those jobs.
--
-- Enforcement lives in the database (RLS) so it cannot be bypassed from the
-- client. The Make sync edge functions use the service-role key (auth.uid() is
-- NULL) and continue to bypass RLS, so they are unaffected.

-- 1. Role enum + profiles table -------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          public.app_role NOT NULL DEFAULT 'employee',
  technician_id TEXT,            -- matches the app's technician ids ('t1','t2'); NULL for admins
  full_name     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Helper functions -----------------------------------------------------------
-- SECURITY DEFINER so they read profiles without triggering profiles' own RLS
-- (avoids infinite recursion between is_admin() and the profiles policies).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_technician_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT technician_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 3. profiles RLS ---------------------------------------------------------------
-- A user may read their own profile; admins may read every profile.
CREATE POLICY "profiles read own or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- Only admins may create/update/delete profiles (employees cannot change their
-- own role or technician assignment).
CREATE POLICY "profiles admin manage" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Employee-update guard ------------------------------------------------------
-- RLS already restricts employees to their own rows for SELECT/UPDATE. This
-- trigger further limits *which columns* an employee may change, so the only
-- thing they can do is report completion. Admins and service-role writes
-- (auth.uid() IS NULL) are not restricted.
CREATE OR REPLACE FUNCTION public.enforce_employee_job_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.city IS DISTINCT FROM OLD.city
       OR NEW.address IS DISTINCT FROM OLD.address
       OR NEW.region IS DISTINCT FROM OLD.region
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.sheet_row_id IS DISTINCT FROM OLD.sheet_row_id
       OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.technician_id IS DISTINCT FROM OLD.technician_id
       OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
       OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time
       OR NEW.estimated_duration IS DISTINCT FROM OLD.estimated_duration
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Employees may only update completion fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_employee_update_malfunctions
  BEFORE UPDATE ON public.malfunctions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_employee_job_update();

CREATE TRIGGER enforce_employee_update_installations
  BEFORE UPDATE ON public.installations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_employee_job_update();

-- 5. Replace the permissive job-table policies ----------------------------------
-- malfunctions
DROP POLICY IF EXISTS "Authenticated read malfunctions" ON public.malfunctions;
DROP POLICY IF EXISTS "Authenticated insert malfunctions" ON public.malfunctions;
DROP POLICY IF EXISTS "Authenticated update malfunctions" ON public.malfunctions;
DROP POLICY IF EXISTS "Authenticated delete malfunctions" ON public.malfunctions;

CREATE POLICY "malfunctions admin all" ON public.malfunctions
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "malfunctions employee read own" ON public.malfunctions
  FOR SELECT TO authenticated
  USING (technician_id = public.current_technician_id());
CREATE POLICY "malfunctions employee update own" ON public.malfunctions
  FOR UPDATE TO authenticated
  USING (technician_id = public.current_technician_id())
  WITH CHECK (technician_id = public.current_technician_id());

-- installations
DROP POLICY IF EXISTS "Authenticated read installations" ON public.installations;
DROP POLICY IF EXISTS "Authenticated insert installations" ON public.installations;
DROP POLICY IF EXISTS "Authenticated update installations" ON public.installations;
DROP POLICY IF EXISTS "Authenticated delete installations" ON public.installations;

CREATE POLICY "installations admin all" ON public.installations
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "installations employee read own" ON public.installations
  FOR SELECT TO authenticated
  USING (technician_id = public.current_technician_id());
CREATE POLICY "installations employee update own" ON public.installations
  FOR UPDATE TO authenticated
  USING (technician_id = public.current_technician_id())
  WITH CHECK (technician_id = public.current_technician_id());

-- 6. customers: admin full access, employees read-only ---------------------------
-- Employees need read access because the daily-route map resolves coordinates
-- from the customers table; they cannot modify customer records.
DROP POLICY IF EXISTS "Authenticated read customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated delete customers" ON public.customers;

CREATE POLICY "customers admin all" ON public.customers
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "customers employee read" ON public.customers
  FOR SELECT TO authenticated
  USING (true);

-- 7. ongoing_services: admin only -----------------------------------------------
DROP POLICY IF EXISTS "Authenticated read ongoing_services" ON public.ongoing_services;
DROP POLICY IF EXISTS "Authenticated insert ongoing_services" ON public.ongoing_services;
DROP POLICY IF EXISTS "Authenticated update ongoing_services" ON public.ongoing_services;
DROP POLICY IF EXISTS "Authenticated delete ongoing_services" ON public.ongoing_services;

CREATE POLICY "ongoing_services admin all" ON public.ongoing_services
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 8. Seed profiles for existing accounts ----------------------------------------
-- Look ids up by email so no generated id is hard-coded. Any other existing
-- user defaults (safely) to an employee with no technician until an admin
-- assigns one.
INSERT INTO public.profiles (id, role, technician_id, full_name)
SELECT id, 'admin'::public.app_role, NULL, 'יוסף טל חרמון'
FROM auth.users WHERE email = 'yoseftalhermon@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.profiles (id, role, technician_id, full_name)
SELECT id, 'employee'::public.app_role, 't2', 'נריה'
FROM auth.users WHERE email = 'talhermon.neriya@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, technician_id = EXCLUDED.technician_id;

INSERT INTO public.profiles (id, role)
SELECT id, 'employee'::public.app_role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
