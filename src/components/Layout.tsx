import { ReactNode, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Bell, ChevronRight, ChevronLeft, Menu,
  History, FolderKanban, ClipboardList, Users, FileBarChart,
  CalendarDays, Search, Plus, Building2, X, ArrowRight,
  Sparkles, BookOpen, Construction, FileArchive, GanttChartSquare, Printer, Radar,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useReminders } from '@/hooks/useReminders';
import { useTasks } from '@/hooks/useTasks';
import { useMeetings } from '@/hooks/useMeetings';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AnimatedBuildingsLogo from '@/components/AnimatedBuildingsLogo';
import ThemeToggle from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { to: '/', label: 'ניהול ההתחדשות העירונית', icon: LayoutDashboard },
  { to: '/command-center', label: 'מרכז פיקוד חכם', icon: Radar },
  { to: '/projects', label: 'פרויקטים', icon: FolderKanban },
  { to: '/gantt-all', label: 'גאנט כולל', icon: GanttChartSquare },
  { to: '/building-plan', label: 'תכנית בניינית 603-0972307', icon: FileArchive },
  { to: '/tama', label: 'תמ״א בביצוע', icon: Construction },
  { to: '/meetings', label: 'ישיבות', icon: CalendarDays },
  { to: '/tasks', label: 'משימות', icon: ClipboardList },
  { to: '/reminders', label: 'תזכורות', icon: Bell },
  { to: '/reports', label: 'דוחות', icon: FileBarChart },
  { to: '/plan-guide', label: 'מדריך תוכנית', icon: BookOpen },
  { to: '/audit-log', label: 'יומן פעילות', icon: History },
  { to: '/users', label: 'משתמשים', icon: Users },
];

const ROUTE_LABELS: Record<string, string> = {
  '/': 'ניהול ההתחדשות העירונית',
  '/command-center': 'מרכז פיקוד חכם',
  '/projects': 'פרויקטים',
  '/gantt-all': 'גאנט כולל',
  '/building-plan': 'תכנית בניינית 603-0972307',
  '/tasks': 'משימות',
  '/meetings': 'ישיבות',
  '/reminders': 'תזכורות',
  '/reports': 'דוחות',
  '/tama': 'תמ״א בביצוע',
  '/plan-guide': 'מדריך תוכנית',
  '/audit-log': 'יומן פעילות',
  '/users': 'משתמשים',
};

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { reminders } = useReminders();
  const { tasks } = useTasks();
  const { meetings } = useMeetings();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return reminders.filter(r => r.status === 'open' && r.due_at && r.due_at.startsWith(today)).length;
  }, [reminders]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ═══ Keyboard shortcuts ═══
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (searchOpen) { setSearchOpen(false); return; }
      }
      if (isInput) return;

      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        navigate('/projects?action=new');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchOpen, navigate]);

  // ═══ Breadcrumb computation ═══
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const crumbs: { label: string; to?: string }[] = [];

    if (path === '/') return [];

    crumbs.push({ label: 'ניהול ההתחדשות העירונית', to: '/' });

    if (path === '/projects') {
      crumbs.push({ label: 'פרויקטים' });
    } else if (path.startsWith('/project/')) {
      crumbs.push({ label: 'פרויקטים', to: '/projects' });
      const parts = path.split('/');
      const projectId = parts[2];
      const project = projects.find(p => p.id === projectId);
      if (project) {
        if (parts.length > 3) {
          crumbs.push({ label: project.project_name, to: `/project/${projectId}` });
          if (parts[3] === 'meeting') crumbs.push({ label: 'ישיבה' });
          else if (parts[3] === '360') crumbs.push({ label: 'שכונה 360°' });
        } else {
          crumbs.push({ label: project.project_name });
        }
      }
    } else if (ROUTE_LABELS[path]) {
      crumbs.push({ label: ROUTE_LABELS[path] });
    }

    return crumbs;
  }, [location.pathname, projects]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    const results: { type: string; label: string; to: string }[] = [];
    projects.forEach(p => {
      const name = p.project_name || '';
      const addr = p.address_cluster_summary || p.source_addresses_text || '';
      const plan = p.plan_number || '';
      if (name.toLowerCase().includes(q) || addr.toLowerCase().includes(q) || plan.toLowerCase().includes(q)) {
        results.push({ type: 'פרויקט', label: name, to: `/project/${p.id}` });
      }
    });
    tasks.forEach(t => {
      if (t.title.toLowerCase().includes(q)) {
        results.push({ type: 'משימה', label: t.title, to: `/project/${t.project_id}?tab=tasks` });
      }
    });
    meetings.forEach(m => {
      const proj = projects.find(p => p.id === m.project_id);
      if (proj && proj.project_name.toLowerCase().includes(q)) {
        results.push({ type: 'ישיבה', label: `${proj.project_name}`, to: `/project/${proj.id}/meeting/${m.id}` });
      }
    });
    return results.slice(0, 8);
  }, [searchQuery, projects, tasks, meetings]);

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-md z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ═══ Sidebar ═══ */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full z-50 flex flex-col transition-all duration-300 ease-out',
          'bg-card border-l border-border/40',
          collapsed ? 'w-[68px]' : 'w-[250px]',
          'md:relative md:z-auto',
          mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        )}
        style={{ boxShadow: '0 0 40px -12px rgba(0,0,0,0.06)' }}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 h-[68px] px-5 border-b border-border/30 shrink-0',
          collapsed && 'justify-center px-0'
        )}>
          <AnimatedBuildingsLogo size={collapsed ? 32 : 38} />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-[14px] font-extrabold leading-tight truncate text-foreground" style={{ letterSpacing: '-0.02em' }}>ניהול פינוי בינוי</h1>
              <p className="text-[10px] text-muted-foreground/60 truncate font-medium">התחדשות עירונית</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item, idx) => {
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-primary/[0.08] text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-l-full transition-all duration-300" style={{ background: 'linear-gradient(180deg, hsl(var(--accent)), hsl(var(--secondary)))' }} />
                )}
                <item.icon className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-all duration-200",
                  isActive ? "text-primary" : "group-hover/nav:scale-110"
                )} />
                {!collapsed && <span>{item.label}</span>}
                {item.to === '/reminders' && todayCount > 0 && (
                  <span className={cn(
                    'font-bold rounded-full flex items-center justify-center leading-none transition-all duration-200',
                    'bg-accent text-accent-foreground',
                    collapsed
                      ? 'absolute -top-0.5 -left-0.5 w-4 h-4 text-[9px]'
                      : 'mr-auto w-5 h-5 text-[10px]'
                  )} style={{ animation: 'pulseGlow 2s ease-in-out infinite' }}>
                    {todayCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Keyboard shortcuts hint */}
        {!collapsed && (
          <div className="px-5 py-3 border-t border-border/30">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40">
              <kbd className="px-1.5 py-0.5 rounded-md bg-muted/80 font-mono text-muted-foreground/60">/</kbd>
              <span>חיפוש</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-muted/80 font-mono text-muted-foreground/60 mr-2">N</kbd>
              <span>חדש</span>
            </div>
          </div>
        )}

        {/* User */}
        {!collapsed && (
          <div className="p-4 border-t border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-primary-foreground shrink-0" style={{ background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--secondary)))' }}>
                יא
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold truncate text-foreground">יוהאן אבוחצירה</p>
                <p className="text-[10px] text-muted-foreground/60">מנהל פרויקטים</p>
              </div>
            </div>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center h-11 border-t border-border/30 text-muted-foreground/30 hover:text-primary hover:bg-primary/[0.04] transition-all duration-200"
        >
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </aside>

      {/* ═══ Main ═══ */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 h-[68px] flex items-center px-5 md:px-8 gap-4 border-b border-border/30" style={{ background: 'hsla(var(--card) / 0.8)', backdropFilter: 'blur(20px) saturate(1.5)' }}>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 rounded-xl"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4.5 w-4.5" />
          </Button>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 ? (
            <nav className="hidden md:flex items-center gap-1.5 text-[13px] min-w-0">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5 min-w-0">
                  {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/20 shrink-0 rotate-180" />}
                  {crumb.to ? (
                    <Link to={crumb.to} className="text-muted-foreground hover:text-primary transition-colors duration-200 truncate">{crumb.label}</Link>
                  ) : (
                    <span className="text-foreground font-bold truncate">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-breathe" />
              <span className="text-[14px] font-extrabold text-foreground">ניהול פינוי בינוי</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Search */}
          <div className="relative" ref={searchRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl hover:bg-muted/80 gap-2.5 text-[12px] text-muted-foreground border border-border/40 hover:border-primary/20 transition-all duration-200 hover:shadow-sm"
              onClick={() => { setSearchOpen(!searchOpen); setTimeout(() => searchInputRef.current?.focus(), 100); }}
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">חיפוש</span>
              <kbd className="hidden md:inline-flex px-1.5 py-0.5 rounded-md bg-muted/80 text-[10px] font-mono text-muted-foreground/60">/</kbd>
            </Button>
            {searchOpen && (
              <div className="absolute left-0 top-full mt-2.5 w-[420px] bg-card border border-border/40 rounded-2xl p-4 animate-enter z-50" style={{ boxShadow: 'var(--shadow-elevated)', backdropFilter: 'blur(20px)' }}>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    ref={searchInputRef}
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="חיפוש פרויקט, משימה, ישיבה…"
                    className="pr-10 h-11 text-sm rounded-xl bg-surface-soft border-0 focus-visible:ring-primary/20"
                    onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); }}
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-0.5 max-h-64 overflow-y-auto">
                    {searchResults.map((r, i) => (
                      <button
                        key={i}
                        className="w-full text-right px-3 py-2.5 rounded-xl text-sm hover:bg-primary/[0.05] transition-all duration-150 flex items-center gap-2.5 group"
                        onClick={() => { navigate(r.to); setSearchOpen(false); setSearchQuery(''); }}
                      >
                        <span className="chip chip-primary text-[10px]">{r.type}</span>
                        <span className="truncate font-medium group-hover:text-primary transition-colors">{r.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">לא נמצאו תוצאות</p>
                )}
                {!searchQuery && (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground/60">הקלד לחיפוש בכל המערכת</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="h-9 rounded-xl hover:bg-muted/80 gap-2 text-[12px] text-muted-foreground border border-border/40 hover:border-primary/20 transition-all duration-200 hover:shadow-sm print:hidden"
            title="הדפס מסך"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden md:inline">הדפס</span>
          </Button>

          <ThemeToggle />

          {/* Quick Create */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 h-9 text-[13px] rounded-xl px-5 font-bold press-scale btn-glow bg-primary hover:bg-primary-hover text-primary-foreground" style={{ boxShadow: '0 2px 12px -2px hsl(var(--primary) / 0.3)' }}>
                <Plus className="h-4 w-4" />
                חדש
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5" style={{ boxShadow: 'var(--shadow-elevated)' }}>
              <DropdownMenuItem onClick={() => navigate('/projects?action=new')} className="rounded-lg py-2.5 text-[13px] cursor-pointer gap-2.5">
                <FolderKanban className="h-4 w-4 text-primary" />פרויקט חדש
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/reminders?action=new')} className="rounded-lg py-2.5 text-[13px] cursor-pointer gap-2.5">
                <Bell className="h-4 w-4 text-secondary" />תזכורת חדשה
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Content */}
        <main className="flex-1 p-5 md:p-8 max-w-[1360px] w-full mx-auto" style={{ animation: 'staggerFadeIn 0.4s ease-out both' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
