import { cn } from '@/lib/utils';
import {
  TaskStatus, CheckStatus, ReviewStatus, MetricStatus, MeetingStatus,
  TASK_STATUS_LABELS, CHECK_STATUS_LABELS, REVIEW_STATUS_LABELS, METRIC_STATUS_LABELS, MEETING_STATUS_LABELS,
} from '@/types/project';

type BadgeType = 'task' | 'check' | 'review' | 'metric' | 'meeting';

interface StatusBadgeProps {
  type: BadgeType;
  status: string;
  className?: string;
}

const taskColors: Record<TaskStatus, string> = {
  open: 'bg-status-blue',
  in_progress: 'bg-status-yellow',
  blocked: 'bg-status-red',
  completed: 'bg-status-green',
};

const checkColors: Record<CheckStatus, string> = {
  red: 'bg-status-red',
  yellow: 'bg-status-yellow',
  green: 'bg-status-green',
};

const reviewColors: Record<ReviewStatus, string> = {
  not_sent: 'bg-muted text-muted-foreground',
  sent: 'bg-status-blue',
  received: 'bg-status-yellow',
  fix_required: 'bg-status-red',
  approved: 'bg-status-green',
};

const metricColors: Record<MetricStatus, string> = {
  inactive: 'bg-muted text-muted-foreground',
  required: 'bg-status-blue',
  in_progress: 'bg-status-yellow',
  submitted: 'bg-accent text-accent-foreground',
  approved: 'bg-status-green',
};

const meetingColors: Record<MeetingStatus, string> = {
  planned: 'bg-status-blue',
  completed: 'bg-status-yellow',
  closed: 'bg-status-green',
};

function getLabel(type: BadgeType, status: string): string {
  switch (type) {
    case 'task': return TASK_STATUS_LABELS[status as TaskStatus] || status;
    case 'check': return CHECK_STATUS_LABELS[status as CheckStatus] || status;
    case 'review': return REVIEW_STATUS_LABELS[status as ReviewStatus] || status;
    case 'metric': return METRIC_STATUS_LABELS[status as MetricStatus] || status;
    case 'meeting': return MEETING_STATUS_LABELS[status as MeetingStatus] || status;
    default: return status;
  }
}

function getColor(type: BadgeType, status: string): string {
  switch (type) {
    case 'task': return taskColors[status as TaskStatus] || '';
    case 'check': return checkColors[status as CheckStatus] || '';
    case 'review': return reviewColors[status as ReviewStatus] || '';
    case 'metric': return metricColors[status as MetricStatus] || '';
    case 'meeting': return meetingColors[status as MeetingStatus] || '';
    default: return '';
  }
}

export default function StatusBadge({ type, status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-primary-foreground',
      getColor(type, status),
      className
    )}>
      {getLabel(type, status)}
    </span>
  );
}
