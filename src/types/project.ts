export const STAGES = [
  { id: 'pre_feasibility', name: 'היתכנות ראשונית', order: 1, phase: 'A' },
  { id: 'resident_agreements', name: 'הסכמות דיירים (66%)', order: 2, phase: 'A' },
  { id: 'resident_committee', name: 'מינוי נציגות דיירים + עו"ד', order: 3, phase: 'A' },
  { id: 'developer_selection', name: 'בחירת יזם + הסכם', order: 4, phase: 'A' },
  { id: 'architect_team', name: 'מינוי אדריכל + צוות יועצים', order: 5, phase: 'A' },
  { id: 'taba_preparation', name: 'הכנת תכנית (תב"ע / תמ"ל)', order: 6, phase: 'B' },
  { id: 'taba_submission', name: 'הגשה לוועדה המקומית', order: 7, phase: 'B' },
  { id: 'taba_validation', name: 'בדיקת שלמות + קליטה', order: 8, phase: 'B' },
  { id: 'taba_deposit', name: 'פרסום להפקדה', order: 9, phase: 'B' },
  { id: 'taba_objections', name: 'דיון + התנגדויות', order: 10, phase: 'B' },
  { id: 'taba_approval', name: 'אישור ועדה מחוזית / ות"ל', order: 11, phase: 'B' },
  { id: 'taba_published', name: 'פרסום לאישור סופי', order: 12, phase: 'B' },
  { id: 'forum1_harmonika', name: 'פורום 1 – הרמוניקה', order: 13, phase: 'C' },
  { id: 'binui_post_forum1', name: 'בינוי – תיקונים אחרי פורום 1', order: 14, phase: 'C' },
  { id: 'forum2_consultants', name: 'פורום 2 – יועצים', order: 15, phase: 'C' },
  { id: 'design_review_pre_forum3', name: 'בקרת תכן לפני פורום 3', order: 16, phase: 'C' },
  { id: 'forum3_committee_prep', name: 'פורום 3 – הכנה לוועדה', order: 17, phase: 'C' },
  { id: 'committee_decision', name: 'ועדה – החלטה/תנאים', order: 18, phase: 'C' },
  { id: 'licensing_prep', name: 'רישוי – הכנה להגשה', order: 19, phase: 'D' },
  { id: 'submission', name: 'הגשה/קליטה', order: 20, phase: 'D' },
  { id: 'completion_rounds', name: 'סבבי השלמות', order: 21, phase: 'D' },
  { id: 'permit', name: 'היתר', order: 22, phase: 'D' },
  { id: 'execution', name: 'ביצוע', order: 23, phase: 'E' },
  { id: 'occupancy', name: 'טופס אכלוס / אכלוס', order: 24, phase: 'E' },
] as const;

export const PHASE_LABELS: Record<string, string> = {
  'A': 'טרום תכנון',
  'B': 'תב"ע / תמ"ל',
  'C': 'בינוי ורישוי',
  'D': 'היתר',
  'E': 'ביצוע',
};

export type StageId = typeof STAGES[number]['id'];

export type ForumType = 'forum1' | 'forum2' | 'forum3';
export type MeetingStatus = 'planned' | 'completed' | 'closed';
export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'completed';
export type CheckStatus = 'red' | 'yellow' | 'green';
export type ReviewStatus = 'not_sent' | 'sent' | 'received' | 'fix_required' | 'approved';
export type MetricStatus = 'inactive' | 'required' | 'in_progress' | 'submitted' | 'approved';
export type MetricPhase = 'א' | 'ב' | 'ג';

export const FORUM_LABELS: Record<ForumType, string> = {
  forum1: 'פורום 1 – הרמוניקה',
  forum2: 'פורום 2 – יועצים',
  forum3: 'פורום 3 – הכנה לוועדה',
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  planned: 'מתוכנן',
  completed: 'בוצע',
  closed: 'נסגר',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  blocked: 'חסום',
  completed: 'הושלם',
};

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  red: 'אדום',
  yellow: 'צהוב',
  green: 'ירוק',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  not_sent: 'לא נשלח',
  sent: 'נשלח',
  received: 'התקבל',
  fix_required: 'נדרש תיקון',
  approved: 'אושר',
};

export const METRIC_STATUS_LABELS: Record<MetricStatus, string> = {
  inactive: 'לא פעיל',
  required: 'נדרש',
  in_progress: 'בטיפול',
  submitted: 'הוגש',
  approved: 'אושר',
};

export const FORUM1_CHECK_ITEMS = [
  'מפגש מבנה-קרקע',
  'הצנעת מערכות ותשתיות',
  'סירקולציה',
  'קומפוזיציה ופיתוח',
  'רצף עירוני',
  'בטיחות ונגישות',
  'שקיפות וגיוון',
  'הנדסת אנוש',
  'ביופיליה',
  'ערכי חינוך ורווחה',
];

export const FORUM2_REVIEWERS = [
  'יועץ תנועה',
  'יועץ תברואה',
  'יועץ ניקוז ונגר',
  'יועץ נטיעות/נוף',
  'יועץ איכות סביבה',
  'חפ״א',
  'גורם: רישוי',
  'גורם: תכנון',
  'גורם: נכסים',
  'גורם: מבני ציבור',
  'גורם: משפטית',
];

export interface Project {
  id: string;
  name: string;
  planNumber: string;
  address: string;
  currentStage: StageId;
  createdAt: string;
  readyForForum3: boolean;
  readyForCommittee: boolean;
  existingUnits: number;
  plannedUnits: number;
  orderIndex: number;
  pinned: boolean;
}

export interface Meeting {
  id: string;
  projectId: string;
  forumType: ForumType;
  date: string;
  status: MeetingStatus;
  rawNotes: string;
  summary: string;
  forum3Summary?: {
    social: string;
    environmental: string;
    operational: string;
    recommendation: string;
  };
}

export interface Decision {
  id: string;
  meetingId: string;
  projectId: string;
  number: number;
  text: string;
}

export interface Task {
  id: string;
  projectId: string;
  decisionId?: string;
  meetingId?: string;
  title: string;
  owner: string;
  deadline: string;
  status: TaskStatus;
  blocker: string;
  notes: string;
}

export interface Forum1Check {
  id: string;
  projectId: string;
  itemIndex: number;
  name: string;
  status: CheckStatus;
  note: string;
}

export interface Forum2Review {
  id: string;
  projectId: string;
  reviewerName: string;
  status: ReviewStatus;
  note: string;
}

export interface MetricTemplate {
  id: string;
  name: string;
  category: string;
  phase: MetricPhase;
  triggerStage: StageId;
}

export interface ProjectMetric {
  id: string;
  projectId: string;
  templateId: string;
  status: MetricStatus;
  evidenceNote: string;
  owner: string;
}

export type ReminderStatus = 'open' | 'done';
export type ReminderPriority = 'normal' | 'urgent';

export interface Reminder {
  id: string;
  title: string;
  dueAt: string;
  projectId?: string;
  status: ReminderStatus;
  priority: ReminderPriority;
  notes?: string;
  createdAt: string;
}

export function getStageName(stageId: StageId): string {
  return STAGES.find(s => s.id === stageId)?.name || stageId;
}

export function getStageOrder(stageId: StageId): number {
  return STAGES.find(s => s.id === stageId)?.order || 0;
}

export function getNextForum(stageId: StageId): string {
  const order = getStageOrder(stageId);
  if (order <= 12) return 'טרם שלב הבינוי';
  if (order <= 14) return 'פורום 1';
  if (order <= 16) return 'פורום 2';
  if (order <= 18) return 'פורום 3';
  if (order <= 19) return 'ועדה';
  return '—';
}

export function getMultiplier(existing: number, planned: number): number {
  if (existing <= 0) return 0;
  return Math.round((planned / existing) * 100) / 100;
}

export function getProjectProgress(stageId: StageId): number {
  const order = getStageOrder(stageId);
  return Math.round((order / STAGES.length) * 100);
}
