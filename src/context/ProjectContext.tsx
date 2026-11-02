import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Project, Meeting, Decision, Task, Forum1Check, Forum2Review, ProjectMetric,
  Reminder, ReminderStatus, ReminderPriority,
  StageId, ForumType, TaskStatus, CheckStatus, ReviewStatus, MetricStatus, MeetingStatus,
  FORUM2_REVIEWERS, FORUM1_CHECK_ITEMS, getStageOrder,
} from '@/types/project';
import { METRIC_TEMPLATES } from '@/data/metrics360Template';
import { seedProjects, seedMeetings, seedDecisions, seedTasks, seedChecks, seedReviews, seedMetrics } from '@/data/seedData';

interface AppState {
  projects: Project[];
  meetings: Meeting[];
  decisions: Decision[];
  tasks: Task[];
  checks: Forum1Check[];
  reviews: Forum2Review[];
  metrics: ProjectMetric[];
  reminders: Reminder[];
  includeLogo: boolean;
}

interface AppContextType extends AppState {
  addProject: (name: string, address: string, existingUnits?: number, plannedUnits?: number, planNumber?: string) => string;
  deleteProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  updateProjectStage: (projectId: string, stage: StageId) => void;
  reorderProjects: (projectIds: string[]) => void;
  pinProject: (projectId: string, pinned: boolean) => void;
  setReadyForForum3: (projectId: string, value: boolean) => void;
  setReadyForCommittee: (projectId: string, value: boolean) => void;
  setIncludeLogo: (value: boolean) => void;
  addMeeting: (projectId: string, forumType: ForumType, date: string) => string;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => void;
  addDecision: (meetingId: string, projectId: string, text: string) => string;
  addTask: (task: Omit<Task, 'id'>) => string;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateCheck: (checkId: string, updates: Partial<Forum1Check>) => void;
  updateReview: (reviewId: string, updates: Partial<Forum2Review>) => void;
  updateMetric: (metricId: string, updates: Partial<ProjectMetric>) => void;
  addReminder: (reminder: Omit<Reminder, 'id'>) => string;
  updateReminder: (reminderId: string, updates: Partial<Reminder>) => void;
  deleteReminder: (reminderId: string) => void;
  canMarkReadyForForum3: (projectId: string) => { ready: boolean; reasons: string[] };
  canMarkReadyForCommittee: (projectId: string) => { ready: boolean; reasons: string[] };
  getProjectTasks: (projectId: string) => Task[];
  getProjectMeetings: (projectId: string) => Meeting[];
  getProjectChecks: (projectId: string) => Forum1Check[];
  getProjectReviews: (projectId: string) => Forum2Review[];
  getProjectMetrics: (projectId: string) => ProjectMetric[];
  getMeetingDecisions: (meetingId: string) => Decision[];
  getNextAction: (projectId: string) => string;
  getStuckWith: (projectId: string) => string;
  getSortedProjects: () => Project[];
}

const AppContext = createContext<AppContextType | null>(null);

function loadState(): AppState {
  try {
    const saved = localStorage.getItem('pinui_binui_state_v3');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old projects without new fields
      if (parsed.projects) {
        parsed.projects = parsed.projects.map((p: any, i: number) => ({
          existingUnits: 0,
          plannedUnits: 0,
          orderIndex: i,
          pinned: false,
          planNumber: '',
          ...p,
        }));
      }
      if (parsed.includeLogo === undefined) parsed.includeLogo = true;
      if (!parsed.reminders) parsed.reminders = [];
      return parsed;
    }
  } catch {}
  return {
    projects: seedProjects,
    meetings: seedMeetings,
    decisions: seedDecisions,
    tasks: seedTasks,
    checks: seedChecks,
    reviews: seedReviews,
    metrics: seedMetrics,
    reminders: [],
    includeLogo: true,
  };
}

let uid = Date.now();
const genId = () => `id_${uid++}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState(prev => {
      const next = fn(prev);
      localStorage.setItem('pinui_binui_state_v3', JSON.stringify(next));
      return next;
    });
  }, []);

  const addProject = useCallback((name: string, address: string, existingUnits = 0, plannedUnits = 0, planNumber = '') => {
    const id = genId();
    const checks: Forum1Check[] = FORUM1_CHECK_ITEMS.map((item, i) => ({
      id: `${id}_check_${i}`, projectId: id, itemIndex: i, name: item, status: 'yellow' as CheckStatus, note: '',
    }));
    const reviews: Forum2Review[] = FORUM2_REVIEWERS.map((r, i) => ({
      id: `${id}_review_${i}`, projectId: id, reviewerName: r, status: 'not_sent' as ReviewStatus, note: '',
    }));
    const metrics: ProjectMetric[] = METRIC_TEMPLATES.map(t => ({
      id: `${id}_${t.id}`, projectId: id, templateId: t.id, status: 'inactive' as MetricStatus, evidenceNote: '', owner: '',
    }));
    update(s => ({
      ...s,
      projects: [...s.projects, {
        id, name, planNumber, address,
        currentStage: 'forum1_harmonika' as StageId,
        createdAt: new Date().toISOString().split('T')[0],
        readyForForum3: false, readyForCommittee: false,
        existingUnits, plannedUnits,
        orderIndex: s.projects.length,
        pinned: false,
      }],
      checks: [...s.checks, ...checks],
      reviews: [...s.reviews, ...reviews],
      metrics: [...s.metrics, ...metrics],
    }));
    return id;
  }, [update]);

  const deleteProject = useCallback((projectId: string) => {
    update(s => ({
      ...s,
      projects: s.projects.filter(p => p.id !== projectId),
      meetings: s.meetings.filter(m => m.projectId !== projectId),
      decisions: s.decisions.filter(d => d.projectId !== projectId),
      tasks: s.tasks.filter(t => t.projectId !== projectId),
      checks: s.checks.filter(c => c.projectId !== projectId),
      reviews: s.reviews.filter(r => r.projectId !== projectId),
      metrics: s.metrics.filter(m => m.projectId !== projectId),
    }));
  }, [update]);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    update(s => ({ ...s, projects: s.projects.map(p => p.id === projectId ? { ...p, ...updates } : p) }));
  }, [update]);

  const updateProjectStage = useCallback((projectId: string, stage: StageId) => {
    update(s => {
      const stageOrder = getStageOrder(stage);
      const updatedMetrics = s.metrics.map(m => {
        if (m.projectId !== projectId) return m;
        const template = METRIC_TEMPLATES.find(t => t.id === m.templateId);
        if (!template) return m;
        const triggerOrder = getStageOrder(template.triggerStage);
        if (triggerOrder <= stageOrder && m.status === 'inactive') {
          return { ...m, status: 'required' as MetricStatus };
        }
        return m;
      });
      return {
        ...s,
        projects: s.projects.map(p => p.id === projectId ? { ...p, currentStage: stage } : p),
        metrics: updatedMetrics,
      };
    });
  }, [update]);

  const reorderProjects = useCallback((projectIds: string[]) => {
    update(s => ({
      ...s,
      projects: s.projects.map(p => ({
        ...p,
        orderIndex: projectIds.indexOf(p.id),
      })),
    }));
  }, [update]);

  const pinProject = useCallback((projectId: string, pinned: boolean) => {
    update(s => ({ ...s, projects: s.projects.map(p => p.id === projectId ? { ...p, pinned } : p) }));
  }, [update]);

  const setReadyForForum3 = useCallback((projectId: string, value: boolean) => {
    update(s => ({ ...s, projects: s.projects.map(p => p.id === projectId ? { ...p, readyForForum3: value } : p) }));
  }, [update]);

  const setReadyForCommittee = useCallback((projectId: string, value: boolean) => {
    update(s => ({ ...s, projects: s.projects.map(p => p.id === projectId ? { ...p, readyForCommittee: value } : p) }));
  }, [update]);

  const setIncludeLogo = useCallback((value: boolean) => {
    update(s => ({ ...s, includeLogo: value }));
  }, [update]);

  const addMeeting = useCallback((projectId: string, forumType: ForumType, date: string) => {
    const id = genId();
    update(s => ({
      ...s,
      meetings: [...s.meetings, { id, projectId, forumType, date, status: 'planned' as MeetingStatus, rawNotes: '', summary: '' }],
    }));
    return id;
  }, [update]);

  const updateMeeting = useCallback((meetingId: string, updates: Partial<Meeting>) => {
    update(s => ({ ...s, meetings: s.meetings.map(m => m.id === meetingId ? { ...m, ...updates } : m) }));
  }, [update]);

  const addDecision = useCallback((meetingId: string, projectId: string, text: string) => {
    const id = genId();
    update(s => {
      const existing = s.decisions.filter(d => d.meetingId === meetingId);
      return { ...s, decisions: [...s.decisions, { id, meetingId, projectId, number: existing.length + 1, text }] };
    });
    return id;
  }, [update]);

  const addTask = useCallback((task: Omit<Task, 'id'>) => {
    const id = genId();
    update(s => ({ ...s, tasks: [...s.tasks, { ...task, id }] }));
    return id;
  }, [update]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    update(s => ({ ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) }));
  }, [update]);

  const updateCheck = useCallback((checkId: string, updates: Partial<Forum1Check>) => {
    update(s => ({ ...s, checks: s.checks.map(c => c.id === checkId ? { ...c, ...updates } : c) }));
  }, [update]);

  const updateReview = useCallback((reviewId: string, updates: Partial<Forum2Review>) => {
    update(s => ({ ...s, reviews: s.reviews.map(r => r.id === reviewId ? { ...r, ...updates } : r) }));
  }, [update]);

  const updateMetric = useCallback((metricId: string, updates: Partial<ProjectMetric>) => {
    update(s => ({ ...s, metrics: s.metrics.map(m => m.id === metricId ? { ...m, ...updates } : m) }));
  }, [update]);

  const addReminder = useCallback((reminder: Omit<Reminder, 'id'>) => {
    const id = genId();
    update(s => ({ ...s, reminders: [...s.reminders, { ...reminder, id }] }));
    return id;
  }, [update]);

  const updateReminder = useCallback((reminderId: string, updates: Partial<Reminder>) => {
    update(s => ({ ...s, reminders: s.reminders.map(r => r.id === reminderId ? { ...r, ...updates } : r) }));
  }, [update]);

  const deleteReminder = useCallback((reminderId: string) => {
    update(s => ({ ...s, reminders: s.reminders.filter(r => r.id !== reminderId) }));
  }, [update]);

  const canMarkReadyForForum3 = useCallback((projectId: string) => {
    const reasons: string[] = [];
    const projectChecks = state.checks.filter(c => c.projectId === projectId);
    const hasRed = projectChecks.some(c => c.status === 'red');
    if (hasRed) reasons.push('יש סעיפים אדומים בבקרת תכן');
    const projectReviews = state.reviews.filter(r => r.projectId === projectId);
    const hasNotReady = projectReviews.some(r => r.status === 'not_sent' || r.status === 'fix_required');
    if (hasNotReady) reasons.push('יש יועצים/גורמים שלא סגורים');
    return { ready: reasons.length === 0, reasons };
  }, [state.checks, state.reviews]);

  const canMarkReadyForCommittee = useCallback((projectId: string) => {
    const reasons: string[] = [];
    const forum3Meetings = state.meetings.filter(m => m.projectId === projectId && m.forumType === 'forum3');
    const hasClosed = forum3Meetings.some(m => m.status === 'closed');
    if (!hasClosed) reasons.push('לא נסגרה ישיבת פורום 3');
    const blockedTasks = state.tasks.filter(t => t.projectId === projectId && t.status === 'blocked');
    if (blockedTasks.length > 0) reasons.push('יש משימות חסומות');
    return { ready: reasons.length === 0, reasons };
  }, [state.meetings, state.tasks]);

  const getProjectTasks = useCallback((projectId: string) => state.tasks.filter(t => t.projectId === projectId), [state.tasks]);
  const getProjectMeetings = useCallback((projectId: string) => state.meetings.filter(m => m.projectId === projectId), [state.meetings]);
  const getProjectChecks = useCallback((projectId: string) => state.checks.filter(c => c.projectId === projectId), [state.checks]);
  const getProjectReviews = useCallback((projectId: string) => state.reviews.filter(r => r.projectId === projectId), [state.reviews]);
  const getProjectMetrics = useCallback((projectId: string) => state.metrics.filter(m => m.projectId === projectId), [state.metrics]);
  const getMeetingDecisions = useCallback((meetingId: string) => state.decisions.filter(d => d.meetingId === meetingId), [state.decisions]);

  const getNextAction = useCallback((projectId: string) => {
    const blocked = state.tasks.filter(t => t.projectId === projectId && t.status === 'blocked');
    if (blocked.length > 0) return `חסם: ${blocked[0].title}`;
    const open = state.tasks.filter(t => t.projectId === projectId && t.status === 'open');
    if (open.length > 0) return open[0].title;
    return 'אין פעולה נדרשת';
  }, [state.tasks]);

  const getStuckWith = useCallback((projectId: string) => {
    const blocked = state.tasks.filter(t => t.projectId === projectId && t.status === 'blocked');
    if (blocked.length > 0) return blocked[0].owner;
    return '—';
  }, [state.tasks]);

  const getSortedProjects = useCallback(() => {
    return [...state.projects].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.orderIndex - b.orderIndex;
    });
  }, [state.projects]);

  return (
    <AppContext.Provider value={{
      ...state, addProject, deleteProject, updateProject, updateProjectStage,
      reorderProjects, pinProject,
      setReadyForForum3, setReadyForCommittee, setIncludeLogo,
      addMeeting, updateMeeting, addDecision, addTask, updateTask,
      updateCheck, updateReview, updateMetric,
      addReminder, updateReminder, deleteReminder,
      canMarkReadyForForum3, canMarkReadyForCommittee,
      getProjectTasks, getProjectMeetings, getProjectChecks, getProjectReviews,
      getProjectMetrics, getMeetingDecisions, getNextAction, getStuckWith,
      getSortedProjects,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
