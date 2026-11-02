import { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useProjects, ProjectWithAddresses } from '@/hooks/useProjects';
import { getStageName, getNextForum, getProjectProgress, STAGES, StageId } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import {
  Plus, Building2, ExternalLink, Trash2, Pin, PinOff, ArrowUp, ArrowDown,
  MoreVertical, Search, Filter, Edit, X, GripVertical, ChevronsUp, ChevronsDown,
  FileSpreadsheet, FolderKanban, AlertTriangle, Loader2, Pencil, Clock, User, FileText, Download, Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportProjectsListPdf, exportProjectsListExcel } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import QuickEditDrawer from '@/components/QuickEditDrawer';
import SmartDocumentImportModal from '@/components/SmartDocumentImportModal';

type SortField = 'manual' | 'name' | 'progress' | 'updated' | 'planNumber' | 'potential';

const riskColor = (level: string | null) => {
  if (level === 'high') return 'bg-destructive/10 text-destructive border-destructive/20';
  if (level === 'medium') return 'bg-orange-50 text-orange-700 border-orange-200';
  return '';
};

const statusLabel = (s: string | null) => {
  if (s === 'active') return 'פעיל';
  if (s === 'on_hold') return 'מושהה';
  if (s === 'stuck') return 'תקוע';
  if (s === 'completed') return 'הושלם';
  return s || '';
};

const statusColor = (s: string | null) => {
  if (s === 'stuck') return 'bg-destructive/10 text-destructive';
  if (s === 'on_hold') return 'bg-orange-50 text-orange-700';
  if (s === 'completed') return 'bg-emerald-50 text-emerald-700';
  return 'bg-primary/5 text-primary';
};

export default function ProjectsPage() {
  const {
    projects: dbProjects, loading,
    addProject: dbAddProject, deleteProject: dbDeleteProject, updateProject: dbUpdateProject,
    reorderProjects: dbReorderProjects, fetchProjects,
  } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setCreateOpen(true);
    }
  }, [searchParams]);

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open && searchParams.get('action') === 'new') {
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  };
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [planNumber, setPlanNumber] = useState('');
  const [existingUnits, setExistingUnits] = useState('');
  const [plannedUnits, setPlannedUnits] = useState('');

  const [quickEditProject, setQuickEditProject] = useState<ProjectWithAddresses | null>(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('manual');

  const handleAdd = async () => {
    if (name.trim()) {
      await dbAddProject({
        project_name: name.trim(),
        address_cluster_summary: address.trim(),
        source_addresses_text: address.trim(),
        plan_number: planNumber.trim(),
        units_in: Number(existingUnits) || 0,
        units_out: Number(plannedUnits) || 0,
        order_index: dbProjects.length,
      });
      setName(''); setAddress(''); setPlanNumber(''); setExistingUnits(''); setPlannedUnits('');
      setCreateOpen(false);
      toast({ title: 'פרויקט נוצר בהצלחה' });
    }
  };

  const handleQuickSave = async (id: string, updates: Record<string, any>) => {
    await dbUpdateProject(id, updates);
    await fetchProjects();
    toast({ title: 'הפרויקט עודכן ✓' });
  };

  const getMultiplier = (unitsIn: number, unitsOut: number) => {
    if (!unitsIn || unitsIn === 0) return 0;
    return Math.round((unitsOut / unitsIn) * 100) / 100;
  };

  const sortedProjects = useMemo(() => {
    const sorted = [...dbProjects].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (a.order_index || 0) - (b.order_index || 0);
    });
    return sorted;
  }, [dbProjects]);

  const filteredProjects = useMemo(() => {
    let list = [...sortedProjects];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        p.project_name.toLowerCase().includes(q) ||
        (p.address_cluster_summary || '').toLowerCase().includes(q) ||
        (p.plan_number || '').toLowerCase().includes(q)
      );
    }
    if (stageFilter !== 'all') list = list.filter(p => p.main_stage === stageFilter);
    if (sortField === 'name') list.sort((a, b) => a.project_name.localeCompare(b.project_name, 'he'));
    else if (sortField === 'progress') list.sort((a, b) => getProjectProgress(b.main_stage as StageId || 'forum1_harmonika') - getProjectProgress(a.main_stage as StageId || 'forum1_harmonika'));
    else if (sortField === 'updated') list.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    else if (sortField === 'planNumber') list.sort((a, b) => (a.plan_number || '').localeCompare(b.plan_number || ''));
    else if (sortField === 'potential') list.sort((a, b) => {
      const ap = (a as any).priority ? 1 : 0;
      const bp = (b as any).priority ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (b.units_out || 0) - (a.units_out || 0);
    });
    return list;
  }, [sortedProjects, searchQuery, stageFilter, sortField]);

  const isDragEnabled = sortField === 'manual' && !searchQuery && stageFilter === 'all';

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const items = [...filteredProjects];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    dbReorderProjects(items.map(p => p.id));
  }, [filteredProjects, dbReorderProjects]);

  const moveProject = (projectId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const ids = sortedProjects.map(p => p.id);
    const idx = ids.indexOf(projectId);
    if (direction === 'up' && idx > 0) [ids[idx], ids[idx - 1]] = [ids[idx - 1], ids[idx]];
    else if (direction === 'down' && idx < ids.length - 1) [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    else if (direction === 'top') { ids.splice(idx, 1); ids.unshift(projectId); }
    else if (direction === 'bottom') { ids.splice(idx, 1); ids.push(projectId); }
    dbReorderProjects(ids);
  };

  const exportToExcel = useCallback(() => {
    const rows = filteredProjects.map(p => ({
      'שם פרויקט': p.project_name,
      'מספר תכנית': p.plan_number || '',
      'כתובת': p.address_cluster_summary || '',
      'רובע': p.quarter || '',
      'שלב נוכחי': getStageName(p.main_stage as StageId || 'forum1_harmonika'),
      'סטטוס ניהולי': p.management_status || '',
      'דירות קיימות': p.units_in || 0,
      'דירות מתוכננות': p.units_out || 0,
      'מכפיל': p.multiplier || 0,
      'יזם': p.developer || '',
      'רשות': p.authority || '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'פרויקטים');
    XLSX.writeFile(wb, `פרויקטים_${formatDate(new Date())}.xlsx`);
  }, [filteredProjects]);

  const hasFilters = searchQuery || stageFilter !== 'all';
  const deleteProjectName = deleteId ? dbProjects.find(p => p.id === deleteId)?.project_name : '';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1>פרויקטים</h1>
            <p className="caption mt-1">{dbProjects.length} פרויקטים פעילים</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-2 h-9 text-[13px] rounded-xl press-scale">
              📥 ייבוא מסמך
            </Button>
            <SmartDocumentImportModal open={importOpen} onOpenChange={setImportOpen} projects={dbProjects} onDone={fetchProjects} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-9 text-[13px] rounded-xl press-scale">
                  <Download className="h-4 w-4" />ייצוא
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportProjectsListPdf(filteredProjects)} className="gap-2">
                  <FileText className="h-4 w-4" />ייצוא PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportProjectsListExcel(filteredProjects)} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />ייצוא Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-9 text-[13px] rounded-xl shadow-sm press-scale"><Plus className="h-4 w-4" />פרויקט חדש</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle>פרויקט חדש</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-1.5"><Label className="text-[13px] font-semibold">שם הפרויקט</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="לדוגמה: מרגנית" className="h-10 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-[13px] font-semibold">מספר תכנית</Label><Input value={planNumber} onChange={e => setPlanNumber(e.target.value)} placeholder="405-0123456" className="h-10 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-[13px] font-semibold">כתובת</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="רחוב הדקלים 12-28" className="h-10 rounded-xl" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-[13px] font-semibold">דירות קיימות</Label><Input type="number" min="0" value={existingUnits} onChange={e => setExistingUnits(e.target.value)} placeholder="0" className="h-10 rounded-xl" /></div>
                    <div className="space-y-1.5"><Label className="text-[13px] font-semibold">דירות מתוכננות</Label><Input type="number" min="0" value={plannedUnits} onChange={e => setPlannedUnits(e.target.value)} placeholder="0" className="h-10 rounded-xl" /></div>
                  </div>
                  <Button onClick={handleAdd} className="w-full h-10 rounded-xl text-[13px] font-semibold press-scale">צור פרויקט</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="חיפוש..." className="pr-10 h-9 text-[13px] bg-secondary/40 border-0 rounded-xl focus-visible:ring-primary/30" />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[160px] h-9 text-[13px] bg-secondary/40 border-0 rounded-xl"><SelectValue placeholder="שלב נוכחי" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">כל השלבים</SelectItem>
              {STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger className="w-[130px] h-9 text-[13px] bg-secondary/40 border-0 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="manual">סדר ידני</SelectItem>
              <SelectItem value="updated">עדכון אחרון</SelectItem>
              <SelectItem value="name">שם</SelectItem>
              <SelectItem value="progress">התקדמות</SelectItem>
              <SelectItem value="planNumber">מספר תכנית</SelectItem>
              <SelectItem value="potential">פוטנציאל</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortField(sortField === 'potential' ? 'manual' : 'potential')}
            className={`h-9 text-[13px] rounded-xl gap-1.5 bg-secondary/40 border-0 font-normal ${sortField === 'potential' ? 'ring-1 ring-primary/40 text-primary' : ''}`}
            title="מיון לפי פוטנציאל (יח״ד יוצא)"
          >
            <Sparkles className="h-3.5 w-3.5" />
            פוטנציאל
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStageFilter('all'); }} className="gap-1.5 text-[12px] h-8 rounded-lg">
              <X className="h-3 w-3" />נקה
            </Button>
          )}
        </div>

        {hasFilters && (
          <div className="flex items-center gap-3 text-sm bg-primary/5 border border-primary/10 rounded-xl px-4 py-2 animate-fade-in">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{filteredProjects.length} תוצאות</span>
          </div>
        )}

        {/* List */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="projects-page">
            {(provided) => (
              <div className="space-y-3" ref={provided.innerRef} {...provided.droppableProps}>
                {filteredProjects.length === 0 && (
                  <div className="premium-card border-dashed border-2 border-border">
                    <div className="py-16 text-center">
                      <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/15 mb-4" />
                      <p className="text-sm font-semibold text-muted-foreground/50">אין פרויקטים להצגה</p>
                      <p className="caption mt-1">צור פרויקט חדש או שנה את הסינון</p>
                    </div>
                  </div>
                )}
                {filteredProjects.map((project, idx) => {
                  const progress = getProjectProgress(project.main_stage as StageId || 'forum1_harmonika');
                  const multiplier = getMultiplier(project.units_in || 0, project.units_out || 0);
                  const hasBlocker = !!(project.main_blocker && project.main_blocker.trim());
                  const isHighRisk = project.risk_level === 'high' || project.risk_level === 'medium';

                  return (
                    <Draggable key={project.id} draggableId={project.id} index={idx} isDragDisabled={!isDragEnabled}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <div className={`premium-card group ${project.pinned ? 'ring-1 ring-primary/20' : ''} ${snapshot.isDragging ? 'shadow-elevated ring-2 ring-primary/30' : ''} ${hasBlocker ? 'border-r-4 border-r-destructive/40' : ''}`}>
                            <div className="p-4">
                              <div className="flex items-start gap-3">
                                {isDragEnabled && (
                                  <div {...provided.dragHandleProps} className="flex items-center pt-1 cursor-grab active:cursor-grabbing text-muted-foreground/15 hover:text-muted-foreground/40 transition-colors">
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  {/* Row 1: Name + badges */}
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {project.pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                                    <Link to={`/project/${project.id}`} className="text-[15px] font-bold text-foreground hover:text-primary transition-colors duration-150">{project.project_name}</Link>
                                    <span className="chip chip-primary text-[11px]">{getStageName(project.main_stage as StageId || 'forum1_harmonika')}</span>
                                    {project.management_status && project.management_status !== 'active' && (
                                      <span className={`chip text-[11px] ${statusColor(project.management_status)}`}>{statusLabel(project.management_status)}</span>
                                    )}
                                    {isHighRisk && (
                                      <span className={`chip text-[11px] ${riskColor(project.risk_level)}`}>
                                        <AlertTriangle className="h-3 w-3 ml-0.5" />
                                        {project.risk_level === 'high' ? 'סיכון גבוה' : 'סיכון בינוני'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Row 2: Key facts */}
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground mb-2">
                                    {project.address_cluster_summary && <span>{project.address_cluster_summary}</span>}
                                    {project.quarter && <span>רובע {project.quarter}</span>}
                                    {project.plan_number && <span className="font-mono text-[11px]">{project.plan_number}</span>}
                                    {project.developer && <span>יזם: <span className="font-semibold text-foreground">{project.developer}</span></span>}
                                    {(project.units_in || 0) > 0 && (
                                      <span>{project.units_in} → {project.units_out} יח"ד <span className="font-bold text-primary">×{multiplier}</span></span>
                                    )}
                                    {(project.units_out || 0) > 0 && (
                                       <span className="font-semibold text-emerald-600" title="פוטנציאל צפוי מהיתרים">₪ {((project.units_out || 0) * 25000 / 1_000_000).toFixed(1)}M</span>
                                    )}
                                  </div>

                                  {/* Row 3: Blocker / Next action */}
                                  {(hasBlocker || project.next_action) && (
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] mb-2">
                                      {hasBlocker && (
                                        <span className="flex items-start gap-1 text-destructive font-medium max-w-full min-w-0">
                                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                          <span className="line-clamp-2 break-words">חסם: {project.main_blocker}</span>
                                        </span>
                                      )}
                                      {project.next_action && (
                                        <span className="flex items-start gap-1 text-muted-foreground max-w-full min-w-0">
                                          <Clock className="h-3 w-3 mt-0.5 shrink-0" />
                                          <span className="line-clamp-2 break-words">
                                            {project.next_action}
                                            {project.next_action_owner && (
                                              <span className="inline-flex items-center gap-0.5 mr-1"><User className="h-3 w-3" />{project.next_action_owner}</span>
                                            )}
                                            {project.next_action_due_date && (
                                              <span className="font-semibold mr-1">{formatDate(project.next_action_due_date)}</span>
                                            )}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Row 4: Progress */}
                                  <div className="flex items-center gap-3 text-xs">
                                    <div className="flex-1 max-w-[200px]"><Progress value={progress} className="h-1.5 rounded-full" /></div>
                                    <span className="text-muted-foreground font-semibold">{progress}%</span>
                                    {project.last_update && (
                                      <span className="text-muted-foreground/60 text-[11px]">עדכון: {formatDate(project.last_update)}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                                    onClick={() => { setQuickEditProject(project); setQuickEditOpen(true); }}
                                    title="עריכה מהירה"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Link to={`/project/${project.id}`}>
                                    <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:bg-primary/5 h-8 text-[12px] rounded-lg">
                                      <ExternalLink className="h-3.5 w-3.5" />פתח
                                    </Button>
                                  </Link>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl p-1.5">
                                      <DropdownMenuItem onClick={() => dbUpdateProject(project.id, { pinned: !project.pinned })} className="rounded-lg py-2">
                                        {project.pinned ? <><PinOff className="h-3.5 w-3.5 ml-2" />הסר נעיצה</> : <><Pin className="h-3.5 w-3.5 ml-2" />נעץ</>}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => moveProject(project.id, 'up')} disabled={idx === 0} className="rounded-lg py-2"><ArrowUp className="h-3.5 w-3.5 ml-2" />הזז למעלה</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => moveProject(project.id, 'down')} disabled={idx === filteredProjects.length - 1} className="rounded-lg py-2"><ArrowDown className="h-3.5 w-3.5 ml-2" />הזז למטה</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => moveProject(project.id, 'top')} className="rounded-lg py-2"><ChevronsUp className="h-3.5 w-3.5 ml-2" />העבר לראש</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => moveProject(project.id, 'bottom')} className="rounded-lg py-2"><ChevronsDown className="h-3.5 w-3.5 ml-2" />העבר לסוף</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => navigate(`/project/${project.id}?tab=reports`)} className="rounded-lg py-2"><FileSpreadsheet className="h-3.5 w-3.5 ml-2" />דוח מצב</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setDeleteId(project.id); setDeleteConfirmName(''); }} className="text-destructive focus:text-destructive rounded-lg py-2"><Trash2 className="h-3.5 w-3.5 ml-2" />מחק</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Quick Edit Drawer */}
        <QuickEditDrawer
          project={quickEditProject}
          open={quickEditOpen}
          onOpenChange={(v) => { setQuickEditOpen(v); if (!v) setQuickEditProject(null); }}
          onSave={handleQuickSave}
        />

        {/* Delete */}
        <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) { setDeleteId(null); setDeleteConfirmName(''); } }}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת פרויקט</AlertDialogTitle>
              <AlertDialogDescription>לאישור הקלד: <strong>{deleteProjectName}</strong></AlertDialogDescription>
            </AlertDialogHeader>
            <Input value={deleteConfirmName} onChange={e => setDeleteConfirmName(e.target.value)} placeholder="הקלד את שם הפרויקט..." className="h-10 rounded-xl" />
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">ביטול</AlertDialogCancel>
              <Button onClick={async () => { if (deleteId && deleteConfirmName === deleteProjectName) { await dbDeleteProject(deleteId); setDeleteId(null); setDeleteConfirmName(''); toast({ title: 'הפרויקט נמחק' }); } }} disabled={deleteConfirmName !== deleteProjectName} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">מחק</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
