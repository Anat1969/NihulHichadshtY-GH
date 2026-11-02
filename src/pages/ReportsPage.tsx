import { useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { getStageName, getProjectProgress, StageId } from '@/types/project';
import { Progress } from '@/components/ui/progress';
import { FileBarChart, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  const { projects, loading } = useProjects();
  const { tasks } = useTasks();
  const today = new Date().toISOString().split('T')[0];

  const projectStats = useMemo(() =>
    projects.map(p => {
      const projectTasks = tasks.filter(t => t.project_id === p.id);
      const stage = (p.main_stage || 'forum1_harmonika') as StageId;
      return {
        project: p,
        openTasks: projectTasks.filter(t => t.status !== 'completed').length,
        blockedTasks: projectTasks.filter(t => t.status === 'blocked').length,
        overdueTasks: projectTasks.filter(t => t.status !== 'completed' && t.deadline && t.deadline < today).length,
        progress: getProjectProgress(stage),
        stageName: getStageName(stage),
      };
    }),
    [projects, tasks, today]
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1>דוחות</h1>
            <p className="caption mt-1">דוחות מצב לפי פרויקטים</p>
          </div>
        </div>

        {loading ? (
          <div className="premium-card border-dashed border-2 border-border">
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 mx-auto text-muted-foreground/30 mb-4 animate-spin" />
              <p className="text-sm text-muted-foreground/60">טוען דוחות...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="premium-card border-dashed border-2 border-border">
            <div className="py-16 text-center">
              <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground/15 mb-4" />
              <p className="text-sm font-semibold text-muted-foreground/50">אין דוחות</p>
              <p className="caption mt-1">צור פרויקט כדי להפיק דוחות</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {projectStats.map(({ project, openTasks, blockedTasks, overdueTasks, progress, stageName }) => (
              <div key={project.id} className="premium-card group p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Link to={`/project/${project.id}`} className="text-[15px] font-bold text-foreground hover:text-primary transition-colors duration-150">
                        {project.project_name}
                      </Link>
                      <span className="chip chip-primary">{stageName}</span>
                    </div>
                    <p className="caption mb-3">{project.address_cluster_summary || project.source_addresses_text || '—'}</p>

                    <div className="flex items-center gap-3 mb-3">
                      <Progress value={progress} className="h-1.5 flex-1 max-w-[200px] rounded-full" />
                      <span className="text-[12px] text-muted-foreground font-semibold">{progress}%</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {openTasks > 0 && <span className="chip chip-warning"><AlertTriangle className="h-3 w-3" />{openTasks} פתוחות</span>}
                      {blockedTasks > 0 && <span className="chip chip-destructive">{blockedTasks} חסמים</span>}
                      {overdueTasks > 0 && <span className="chip chip-destructive">{overdueTasks} באיחור</span>}
                    </div>
                  </div>

                  <Link to={`/project/${project.id}?tab=reports`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-[12px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 rounded-lg">
                      <FileBarChart className="h-3.5 w-3.5" />צפה בדוח
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
