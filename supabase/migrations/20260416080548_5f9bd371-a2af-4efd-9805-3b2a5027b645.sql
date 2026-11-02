
-- Create projects table with all core fields
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  quarter TEXT DEFAULT '',
  address_cluster_summary TEXT DEFAULT '',
  source_addresses_text TEXT DEFAULT '',
  plan_number TEXT DEFAULT '',
  authority TEXT DEFAULT 'עיריית אשדוד',
  developer TEXT DEFAULT '',
  plan_submitter TEXT DEFAULT '',
  units_in INTEGER DEFAULT 0,
  units_out INTEGER DEFAULT 0,
  multiplier NUMERIC(6,2) DEFAULT 0,
  main_stage TEXT DEFAULT 'binui_prep_forum1',
  sub_stage TEXT DEFAULT '',
  management_status TEXT DEFAULT 'active',
  risk_level TEXT DEFAULT 'low',
  main_blocker TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  next_action_owner TEXT DEFAULT '',
  next_action_due_date DATE,
  last_update TIMESTAMPTZ DEFAULT now(),
  notes TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create project_addresses table
CREATE TABLE public.project_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  street_name TEXT NOT NULL,
  building_numbers TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_addresses ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required at this stage)
CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update projects" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Public delete projects" ON public.projects FOR DELETE USING (true);

CREATE POLICY "Public read addresses" ON public.project_addresses FOR SELECT USING (true);
CREATE POLICY "Public insert addresses" ON public.project_addresses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update addresses" ON public.project_addresses FOR UPDATE USING (true);
CREATE POLICY "Public delete addresses" ON public.project_addresses FOR DELETE USING (true);

-- Index for fast address lookups
CREATE INDEX idx_project_addresses_project_id ON public.project_addresses(project_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
