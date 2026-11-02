CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null default '',
  owner text not null default '',
  deadline date,
  status text not null default 'open',
  priority text not null default 'medium',
  blocker text not null default '',
  notes text not null default '',
  meeting_id uuid,
  decision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text not null default 'medium';
ALTER TABLE public.tasks ALTER COLUMN title SET DEFAULT '';
ALTER TABLE public.tasks ALTER COLUMN owner SET DEFAULT '';
ALTER TABLE public.tasks ALTER COLUMN owner SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN blocker SET DEFAULT '';
ALTER TABLE public.tasks ALTER COLUMN blocker SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN notes SET DEFAULT '';
ALTER TABLE public.tasks ALTER COLUMN notes SET NOT NULL;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  forum_type text not null default 'forum1',
  date date,
  time text,
  time_end text,
  status text not null default 'planned',
  raw_notes text not null default '',
  summary text not null default '',
  forum3_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS time text;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS time_end text;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS forum3_summary jsonb;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.forum1_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  item_index integer not null default 0,
  name text not null default '',
  status text not null default 'yellow',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
ALTER TABLE public.forum1_checks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.forum2_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  reviewer_name text not null default '',
  status text not null default 'not_sent',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
ALTER TABLE public.forum2_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.project_stage_dates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  stage_id text not null,
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, stage_id)
);
ALTER TABLE public.project_stage_dates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  due_at timestamptz,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'open',
  priority text not null default 'normal',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_meetings_project ON public.meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_forum ON public.meetings(forum_type);
CREATE INDEX IF NOT EXISTS idx_forum1_checks_project ON public.forum1_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_forum2_reviews_project ON public.forum2_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stage_dates_project ON public.project_stage_dates(project_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON public.reminders(due_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'allow all for authenticated') THEN
    CREATE POLICY "allow all for authenticated" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'meetings' AND policyname = 'allow all meetings') THEN
    CREATE POLICY "allow all meetings" ON public.meetings FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum1_checks' AND policyname = 'allow all forum1_checks') THEN
    CREATE POLICY "allow all forum1_checks" ON public.forum1_checks FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum2_reviews' AND policyname = 'allow all forum2_reviews') THEN
    CREATE POLICY "allow all forum2_reviews" ON public.forum2_reviews FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_stage_dates' AND policyname = 'allow all project_stage_dates') THEN
    CREATE POLICY "allow all project_stage_dates" ON public.project_stage_dates FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminders' AND policyname = 'allow all reminders') THEN
    CREATE POLICY "allow all reminders" ON public.reminders FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
    CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_meetings_updated_at') THEN
    CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_forum1_checks_updated_at') THEN
    CREATE TRIGGER update_forum1_checks_updated_at BEFORE UPDATE ON public.forum1_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_forum2_reviews_updated_at') THEN
    CREATE TRIGGER update_forum2_reviews_updated_at BEFORE UPDATE ON public.forum2_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_stage_dates_updated_at') THEN
    CREATE TRIGGER update_project_stage_dates_updated_at BEFORE UPDATE ON public.project_stage_dates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reminders_updated_at') THEN
    CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;