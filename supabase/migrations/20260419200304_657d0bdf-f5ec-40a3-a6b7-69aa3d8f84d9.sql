CREATE TABLE IF NOT EXISTS public.forum1_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_index INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'yellow',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum1_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read forum1_checks" ON public.forum1_checks FOR SELECT USING (true);
CREATE POLICY "Public insert forum1_checks" ON public.forum1_checks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update forum1_checks" ON public.forum1_checks FOR UPDATE USING (true);
CREATE POLICY "Public delete forum1_checks" ON public.forum1_checks FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_forum1_checks_project ON public.forum1_checks(project_id);

CREATE TABLE IF NOT EXISTS public.forum2_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'not_sent',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum2_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read forum2_reviews" ON public.forum2_reviews FOR SELECT USING (true);
CREATE POLICY "Public insert forum2_reviews" ON public.forum2_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update forum2_reviews" ON public.forum2_reviews FOR UPDATE USING (true);
CREATE POLICY "Public delete forum2_reviews" ON public.forum2_reviews FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_forum2_reviews_project ON public.forum2_reviews(project_id);