-- Restrict all public (anon) RLS policies to authenticated users only.
-- Before this migration every table allowed anon read/write/delete, which is unsafe
-- once the app is on a public URL. The web app now requires login (Supabase Auth);
-- the Make sync edge functions use the service-role key and bypass RLS, so they are
-- unaffected. The /confirm page does not touch the database.

-- ongoing_services -----------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read access" ON public.ongoing_services;
DROP POLICY IF EXISTS "Allow public insert access" ON public.ongoing_services;

CREATE POLICY "Authenticated read ongoing_services" ON public.ongoing_services
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert ongoing_services" ON public.ongoing_services
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update ongoing_services" ON public.ongoing_services
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete ongoing_services" ON public.ongoing_services
  FOR DELETE TO authenticated USING (true);

-- malfunctions ---------------------------------------------------------------
DROP POLICY IF EXISTS "Public read malfunctions" ON public.malfunctions;
DROP POLICY IF EXISTS "Public insert malfunctions" ON public.malfunctions;
DROP POLICY IF EXISTS "Public update malfunctions" ON public.malfunctions;
DROP POLICY IF EXISTS "Public delete malfunctions" ON public.malfunctions;

CREATE POLICY "Authenticated read malfunctions" ON public.malfunctions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert malfunctions" ON public.malfunctions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update malfunctions" ON public.malfunctions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete malfunctions" ON public.malfunctions
  FOR DELETE TO authenticated USING (true);

-- installations --------------------------------------------------------------
DROP POLICY IF EXISTS "Public read installations" ON public.installations;
DROP POLICY IF EXISTS "Public insert installations" ON public.installations;
DROP POLICY IF EXISTS "Public update installations" ON public.installations;
DROP POLICY IF EXISTS "Public delete installations" ON public.installations;

CREATE POLICY "Authenticated read installations" ON public.installations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert installations" ON public.installations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update installations" ON public.installations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete installations" ON public.installations
  FOR DELETE TO authenticated USING (true);

-- customers ------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read customers" ON public.customers;
DROP POLICY IF EXISTS "Public insert customers" ON public.customers;
DROP POLICY IF EXISTS "Public update customers" ON public.customers;
DROP POLICY IF EXISTS "Public delete customers" ON public.customers;

CREATE POLICY "Authenticated read customers" ON public.customers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update customers" ON public.customers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete customers" ON public.customers
  FOR DELETE TO authenticated USING (true);
