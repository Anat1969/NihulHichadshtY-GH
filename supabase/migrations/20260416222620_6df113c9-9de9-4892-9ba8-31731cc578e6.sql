
-- Create separate tama_sites table (isolated from pinui-binui projects)
CREATE TABLE public.tama_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_number TEXT,
  request_number TEXT,
  site_address TEXT NOT NULL DEFAULT '',
  quarter TEXT,
  cranes_count TEXT,
  building_type TEXT,
  permit_description TEXT,
  contact_person TEXT,
  phone TEXT,
  construction_status TEXT,
  notes TEXT,
  permit_validity TEXT,
  yuval_notes TEXT,
  cranes_text TEXT,
  -- Internal management fields (editable inside system, not from excel source)
  review_status TEXT NOT NULL DEFAULT 'תקין',
  review_note TEXT NOT NULL DEFAULT '',
  is_anomaly BOOLEAN NOT NULL DEFAULT false,
  source_row_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tama_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tama_sites" ON public.tama_sites FOR SELECT USING (true);
CREATE POLICY "Public insert tama_sites" ON public.tama_sites FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tama_sites" ON public.tama_sites FOR UPDATE USING (true);
CREATE POLICY "Public delete tama_sites" ON public.tama_sites FOR DELETE USING (true);

CREATE TRIGGER update_tama_sites_updated_at
  BEFORE UPDATE ON public.tama_sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tama_sites_quarter ON public.tama_sites(quarter);
CREATE INDEX idx_tama_sites_status ON public.tama_sites(construction_status);
