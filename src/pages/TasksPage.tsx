import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { TASK_STATUS_LABELS, TaskStatus } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ClipboardList, Search, Filter, X, ExternalLink, AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';

export default function TasksPage() {
  const { tasks, updateTask, loading } = useTasks();
  const { projects } = useProjects();
  const today = new Date().toISOString().split('T')[0];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || (t.owner || '').toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    if (projectFilter !== 'all') list = list.filter(t => t.project_id === projectFilter);
    if (overdueOnly) list = list.filter(t => t.status !== 'completed' && t.deadline && t.deadline < today);
    return list;
  }, [tasks, search, statusFilter, projectFilter, overdueOnly, today]);

  const hasFilters = search || statusFilter !== 'all' || projectFilter !== 'all' || overdueOnly;
  const totalOpen = tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const totalBlocked = tasks.filter(t => t.status === 'blocked').length;
  const totalOverdue = tasks.filter(t => t.status !== 'completed' && t.deadline && t.deadline < today).length;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />;
      case 'blocked': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'in_progress': return <Loader2 className="h-4 w-4 text-primary" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1>משימות</h1>
            <p className="caption mt-1">{tasks.length} משימות במערכת</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="chip chip-warning">{totalOpen} פתוחות</span>
            <span className="chip chip-destructive">{totalBlocked} חסומות</span>
            {totalOverdue > 0 && (
              <Button variant="ghost" size="sm" className="chip chip-destructive cursor-pointer" onClick={() => setOverdueOnly(!overdueOnly)}>
                {totalOverdue} באיחור
              </Button>
            )}
          </div>
        </div>

        <div className="toolbar">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי כותרת או אחראי..." className="pr-10 h-9 text-[13px] bg-secondary/40 border-0 rounded-xl focus-visible:ring-primary/30" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-[13px] bg-secondary/40 border-0 rounded-xl"><SelectValue placeholder="סטטוס" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[160px] h-9 text-[13px] bg-secondary/40 border-0 rounded-xl"><SelectValue placeholder="פרויקט" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">כל הפרויקטים</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={overdueOnly ? 'default' : 'outline'} size="sm" className="h-9 text-[12px] gap-1.5 rounded-xl" onClick={() => setOverdueOnly(!overdueOnly)}>
            <AlertTriangle className="h-3.5 w-3.5" />באיחור
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setProjectFilter('all'); setOverdueOnly(false); }} className="gap-1.5 text-[12px] h-8 rounded-lg">
              <X className="h-3 w-3" />נקה
            </Button>
          )}
        </div>

        {hasFilters && (
          <div className="flex items-center gap-3 text-sm bg-primary/5 border border-primary/10 rounded-xl px-4 py-2 animate-enter">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{filtered.length} תוצאות</span>
          </div>
        )}

        {loading ? (
          <div className="premium-card border-dashed border-2 border-border">
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 mx-auto text-muted-foreground/30 mb-4 animate-spin" />
              <p className="text-sm text-muted-foreground/60">טוען משימות...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="premium-card border-dashed border-2 border-border">
            <div className="py-16 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/15 mb-4" />
              <p className="text-sm font-semibold text-muted-foreground/50">אין משימות להצגה</p>
              <p className="caption mt-1">משימות שייווצרו בעמודי הפרויקט יופיעו כאן</p>
            </div>
          </div>
        ) : (
          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10"></th>
                    <th>כותרת</th>
                    <th>פרויקט</th>
                    <th>אחראי</th>
                    <th>דדליין</th>
                    <th>סטטוס</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(task => {
                    const project = projects.find(p => p.id === task.project_id);
                    const isOverdue = task.status !== 'completed' && task.deadline && task.deadline < today;
                    return (
                      <tr key={task.id} className={`group ${isOverdue ? 'bg-destructive/[0.02]' : ''}`}>
                        <td>{statusIcon(task.status)}</td>
                        <td className="font-semibold text-sm">{task.title}</td>
                        <td className="text-muted-foreground">
                          {project ? <Link to={`/project/${project.id}`} className="hover:text-primary transition-colors">{project.project_name}</Link> : '—'}
                        </td>
                        <td className="text-muted-foreground">{task.owner || '—'}</td>
                        <td className={isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                          {task.deadline ? formatDate(task.deadline) : '—'}
                          {isOverdue && <span className="mr-1.5 chip chip-destructive">באיחור</span>}
                        </td>
                        <td>
                          <Select value={task.status} onValueChange={(v) => updateTask(task.id, { status: v })}>
                            <SelectTrigger className="h-7 w-[100px] text-[12px] border-0 bg-transparent hover:bg-muted/50 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td>
                          {project && (
                            <Link to={`/project/${project.id}?tab=tasks`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary rounded-lg"><ExternalLink className="h-3.5 w-3.5" /></Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
