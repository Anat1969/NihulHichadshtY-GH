import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { ArrowRight, Globe, Loader2, Info } from 'lucide-react';

type Project = Tables<'projects'>;

export default function Neighborhood360Page() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
      setProject(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-muted-foreground/30 animate-spin mb-3" />
          <p className="text-sm text-muted-foreground/60">טוען נתוני פרויקט...</p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-lg font-medium text-muted-foreground">פרויקט לא נמצא</p>
          <Link to="/projects" className="text-sm text-primary hover:underline mt-3">חזרה לרשימת הפרויקטים</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">דשבורד</Link>
          <ArrowRight className="h-3 w-3 rotate-180" />
          <Link to={`/project/${id}`} className="hover:text-foreground transition-colors">{project.project_name}</Link>
          <ArrowRight className="h-3 w-3 rotate-180" />
          <span className="text-foreground font-medium">שכונה 360°</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">שכונה 360°</h1>
            <p className="text-muted-foreground text-sm">{project.project_name}</p>
          </div>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4 mx-auto">
              <Info className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-foreground mb-1">אין עדיין נתוני 360° אמיתיים</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              מודול 44 המדדים יחובר למקור נתונים אמיתי בשלב הבא של ייצוב המערכת.
              אין כאן נתוני דמה.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
