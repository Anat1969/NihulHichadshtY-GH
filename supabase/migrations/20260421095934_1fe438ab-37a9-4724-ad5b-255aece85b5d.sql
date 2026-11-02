CREATE TABLE public.project_stage_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id text NOT NULL,
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, stage_id)
);

ALTER TABLE public.project_stage_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read project_stage_dates" ON public.project_stage_dates FOR SELECT USING (true);
CREATE POLICY "Public insert project_stage_dates" ON public.project_stage_dates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update project_stage_dates" ON public.project_stage_dates FOR UPDATE USING (true);
CREATE POLICY "Public delete project_stage_dates" ON public.project_stage_dates FOR DELETE USING (true);

CREATE TRIGGER update_project_stage_dates_updated_at
BEFORE UPDATE ON public.project_stage_dates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();