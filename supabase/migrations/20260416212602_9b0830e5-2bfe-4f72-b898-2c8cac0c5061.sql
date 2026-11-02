-- ============ TASKS ============
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  decision_id UUID,
  meeting_id UUID,
  title TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'open',
  blocker TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Public insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Public delete tasks" ON public.tasks FOR DELETE USING (true);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MEETINGS ============
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  forum_type TEXT NOT NULL DEFAULT 'forum1',
  date DATE,
  status TEXT NOT NULL DEFAULT 'planned',
  raw_notes TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  forum3_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read meetings" ON public.meetings FOR SELECT USING (true);
CREATE POLICY "Public insert meetings" ON public.meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update meetings" ON public.meetings FOR UPDATE USING (true);
CREATE POLICY "Public delete meetings" ON public.meetings FOR DELETE USING (true);
CREATE INDEX idx_meetings_project ON public.meetings(project_id);
CREATE INDEX idx_meetings_forum ON public.meetings(forum_type);
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DECISIONS ============
CREATE TABLE public.decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number INTEGER NOT NULL DEFAULT 1,
  text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read decisions" ON public.decisions FOR SELECT USING (true);
CREATE POLICY "Public insert decisions" ON public.decisions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update decisions" ON public.decisions FOR UPDATE USING (true);
CREATE POLICY "Public delete decisions" ON public.decisions FOR DELETE USING (true);
CREATE INDEX idx_decisions_meeting ON public.decisions(meeting_id);
CREATE INDEX idx_decisions_project ON public.decisions(project_id);
CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON public.decisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REMINDERS ============
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  due_at TIMESTAMPTZ,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reminders" ON public.reminders FOR SELECT USING (true);
CREATE POLICY "Public insert reminders" ON public.reminders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update reminders" ON public.reminders FOR UPDATE USING (true);
CREATE POLICY "Public delete reminders" ON public.reminders FOR DELETE USING (true);
CREATE INDEX idx_reminders_status ON public.reminders(status);
CREATE INDEX idx_reminders_due ON public.reminders(due_at);
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  action TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read audit_log" ON public.audit_log FOR SELECT USING (true);
CREATE POLICY "Public insert audit_log" ON public.audit_log FOR INSERT WITH CHECK (true);
CREATE INDEX idx_audit_project ON public.audit_log(project_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);