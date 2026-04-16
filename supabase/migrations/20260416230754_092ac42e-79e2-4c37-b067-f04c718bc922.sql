-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Malfunctions table
CREATE TABLE public.malfunctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  region TEXT,
  description TEXT,
  malfunction_date DATE,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  sheet_row_id TEXT UNIQUE,
  source TEXT DEFAULT 'app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.malfunctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read malfunctions" ON public.malfunctions FOR SELECT USING (true);
CREATE POLICY "Public insert malfunctions" ON public.malfunctions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update malfunctions" ON public.malfunctions FOR UPDATE USING (true);
CREATE POLICY "Public delete malfunctions" ON public.malfunctions FOR DELETE USING (true);

CREATE TRIGGER malfunctions_updated_at
  BEFORE UPDATE ON public.malfunctions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Installations table
CREATE TABLE public.installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  region TEXT,
  product_type TEXT,
  installation_date DATE,
  installation_time TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  sheet_row_id TEXT UNIQUE,
  source TEXT DEFAULT 'app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read installations" ON public.installations FOR SELECT USING (true);
CREATE POLICY "Public insert installations" ON public.installations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update installations" ON public.installations FOR UPDATE USING (true);
CREATE POLICY "Public delete installations" ON public.installations FOR DELETE USING (true);

CREATE TRIGGER installations_updated_at
  BEFORE UPDATE ON public.installations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime
ALTER TABLE public.malfunctions REPLICA IDENTITY FULL;
ALTER TABLE public.installations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.malfunctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.installations;

-- Indexes for sync
CREATE INDEX idx_malfunctions_sheet_row ON public.malfunctions(sheet_row_id);
CREATE INDEX idx_installations_sheet_row ON public.installations(sheet_row_id);