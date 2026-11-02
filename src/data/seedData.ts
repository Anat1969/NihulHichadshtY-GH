import {
  Project, Meeting, Decision, Task, Forum1Check, Forum2Review, ProjectMetric,
  StageId, FORUM1_CHECK_ITEMS, FORUM2_REVIEWERS, getStageOrder,
} from '@/types/project';
import { METRIC_TEMPLATES } from './metrics360Template';

function generateMetrics(projectId: string, currentStage: StageId): ProjectMetric[] {
  const stageOrder = getStageOrder(currentStage);
  return METRIC_TEMPLATES.map(t => {
    const triggerOrder = getStageOrder(t.triggerStage);
    let status: ProjectMetric['status'] = 'inactive';
    if (triggerOrder <= stageOrder) {
      status = 'required';
      const r = Math.random();
      if (r > 0.7) status = 'in_progress';
      if (r > 0.85) status = 'submitted';
      if (r > 0.95) status = 'approved';
    }
    return {
      id: `${projectId}_${t.id}`,
      projectId,
      templateId: t.id,
      status,
      evidenceNote: status === 'submitted' ? 'הועלה מסמך ביסוס' : status === 'approved' ? 'אושר ע"י הוועדה' : '',
      owner: '',
    };
  });
}

function generateChecks(projectId: string, withRed: boolean): Forum1Check[] {
  return FORUM1_CHECK_ITEMS.map((name, i) => ({
    id: `${projectId}_check_${i}`,
    projectId,
    itemIndex: i,
    name,
    status: withRed && i === 2 ? 'red' as const : i < 5 ? 'green' as const : i < 8 ? 'yellow' as const : 'green' as const,
    note: i === 2 && withRed ? 'נדרש שיפור בתנועת הולכי רגל' : '',
  }));
}

function generateReviews(projectId: string, withFix: boolean): Forum2Review[] {
  return FORUM2_REVIEWERS.map((name, i) => ({
    id: `${projectId}_review_${i}`,
    projectId,
    reviewerName: name,
    status: withFix && i === 0 ? 'fix_required' as const :
            i < 4 ? 'approved' as const :
            i < 7 ? 'received' as const :
            i < 9 ? 'sent' as const : 'not_sent' as const,
    note: withFix && i === 0 ? 'חוות דעת תנועה מעודכנת נדרשת לאחר שינוי תוכנית' : '',
  }));
}

export const seedProjects: Project[] = [
  { id: 'p4', name: 'מרגנית', planNumber: '', address: 'אשדוד', currentStage: 'forum1_harmonika', createdAt: '2025-02-01', readyForForum3: false, readyForCommittee: false, existingUnits: 0, plannedUnits: 0, orderIndex: 0, pinned: false },
  { id: 'p5', name: 'הרב מימון', planNumber: '', address: 'אשדוד', currentStage: 'forum1_harmonika', createdAt: '2025-02-01', readyForForum3: false, readyForCommittee: false, existingUnits: 0, plannedUnits: 0, orderIndex: 1, pinned: false },
  { id: 'p6', name: 'המעפלים', planNumber: '', address: 'אשדוד', currentStage: 'forum1_harmonika', createdAt: '2025-03-01', readyForForum3: false, readyForCommittee: false, existingUnits: 0, plannedUnits: 0, orderIndex: 2, pinned: false },
  { id: 'p7', name: 'מרכז מסחרי איזור א', planNumber: '', address: 'אשדוד', currentStage: 'forum1_harmonika', createdAt: '2025-03-01', readyForForum3: false, readyForCommittee: false, existingUnits: 0, plannedUnits: 0, orderIndex: 3, pinned: false },
];

export const seedMeetings: Meeting[] = [];

export const seedDecisions: Decision[] = [];

const owners = ['אני', 'אדריכל', 'יזם', 'יועץ תנועה', 'עירייה', 'יועץ ניקוז', 'יועץ נוף', 'משפטית'];

export const seedTasks: Task[] = [];

export const seedChecks: Forum1Check[] = [
  ...generateChecks('p4', false),
  ...generateChecks('p5', false),
  ...generateChecks('p6', false),
  ...generateChecks('p7', false),
];

export const seedReviews: Forum2Review[] = [
  ...generateReviews('p4', false),
  ...generateReviews('p5', false),
  ...generateReviews('p6', false),
  ...generateReviews('p7', false),
];

export const seedMetrics: ProjectMetric[] = [
  ...generateMetrics('p4', 'forum1_harmonika'),
  ...generateMetrics('p5', 'forum1_harmonika'),
  ...generateMetrics('p6', 'forum1_harmonika'),
  ...generateMetrics('p7', 'forum1_harmonika'),
];
