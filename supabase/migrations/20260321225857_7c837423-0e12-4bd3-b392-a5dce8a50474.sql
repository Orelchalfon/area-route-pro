CREATE TABLE public.ongoing_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_date DATE NOT NULL,
  task_description TEXT NOT NULL,
  location TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ongoing_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.ongoing_services
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert access" ON public.ongoing_services
  FOR INSERT TO anon, authenticated WITH CHECK (true);