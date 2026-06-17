-- Customers table — canonical customer list (replaces the bundled public/contacts.csv
-- at runtime). Mirrors the Customer type in src/types/index.ts. Follows the same
-- conventions as malfunctions/installations: public RLS, shared set_updated_at trigger,
-- realtime, and an indexed natural key (import_key) for idempotent one-time imports.
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  email TEXT,
  product TEXT,
  filter_replacement_month INT DEFAULT 0,
  service_track TEXT,
  next_service_date DATE,
  notes TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  place_id TEXT,
  import_key TEXT UNIQUE,
  source TEXT DEFAULT 'import',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Public insert customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update customers" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Public delete customers" ON public.customers FOR DELETE USING (true);

-- Reuse public.set_updated_at() defined in the 2026-04-16 migration.
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;

-- Index for idempotent imports / dedupe
CREATE INDEX idx_customers_import_key ON public.customers(import_key);
