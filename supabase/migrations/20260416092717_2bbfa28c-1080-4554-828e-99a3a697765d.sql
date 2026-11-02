
CREATE TABLE public.project_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'image',
  description TEXT DEFAULT '',
  source TEXT DEFAULT '',
  slide_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read project_assets" ON public.project_assets FOR SELECT USING (true);
CREATE POLICY "Public insert project_assets" ON public.project_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update project_assets" ON public.project_assets FOR UPDATE USING (true);
CREATE POLICY "Public delete project_assets" ON public.project_assets FOR DELETE USING (true);

CREATE INDEX idx_project_assets_project_id ON public.project_assets(project_id);
