import { useState } from 'react';
import { useForumReviews } from '@/hooks/useForumData';
import { REVIEW_STATUS_LABELS, type ReviewStatus } from '@/types/project';
import { Loader2, Users, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<ReviewStatus, { label: string; dot: string; bg: string; text: string }> = {
  not_sent:     { label: REVIEW_STATUS_LABELS.not_sent,     dot: 'bg-muted-foreground/30',               bg: 'bg-muted/30 border-border/40',              text: 'text-muted-foreground' },
  sent:         { label: REVIEW_STATUS_LABELS.sent,         dot: 'bg-blue-400',                          bg: 'bg-blue-50/60 border-blue-100',             text: 'text-blue-700' },
  received:     { label: REVIEW_STATUS_LABELS.received,     dot: 'bg-[hsl(var(--status-yellow))]',       bg: 'bg-orange-50/60 border-orange-100',         text: 'text-orange-700' },
  fix_required: { label: REVIEW_STATUS_LABELS.fix_required, dot: 'bg-[hsl(var(--status-red))]',          bg: 'bg-red-50/60 border-red-100',               text: 'text-red-700' },
  approved:     { label: REVIEW_STATUS_LABELS.approved,     dot: 'bg-[hsl(var(--status-green))]',        bg: 'bg-emerald-50/60 border-emerald-100',       text: 'text-emerald-700' },
};

const ALL_STATUSES: ReviewStatus[] = ['not_sent', 'sent', 'received', 'fix_required', 'approved'];

export default function Forum2ReviewsTab({ projectId }: { projectId: string }) {
  const { reviews, loading, updateReview } = useForumReviews(projectId);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const approvedCount = reviews.filter(r => r.status === 'approved').length;
  const fixCount = reviews.filter(r => r.status === 'fix_required').length;
  const pendingCount = reviews.filter(r => r.status === 'not_sent' || r.status === 'sent').length;
  const allApproved = approvedCount === reviews.length && reviews.length > 0;

  const saveNote = (id: string) => {
    updateReview(id, { note: noteValue });
    setEditingNote(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" />
          יועצים וגורמים – פורום 2
        </div>
        <div className="flex flex-wrap gap-2 text-[12px]">
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1">אושר <span className="font-bold">{approvedCount}</span></span>
          <span className="bg-red-50 text-red-700 border border-red-100 rounded-full px-2.5 py-1">נדרש תיקון <span className="font-bold">{fixCount}</span></span>
          <span className="bg-secondary/60 text-muted-foreground rounded-full px-2.5 py-1">ממתין <span className="font-bold text-foreground">{pendingCount}</span></span>
        </div>
        {fixCount > 0 && <div className="text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 inline-block w-fit">{fixCount} גורמים דורשים תיקון</div>}
        {allApproved && <div className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 inline-block w-fit">כל היועצים אישרו ✓</div>}
      </div>

      <div className="space-y-2">
        {reviews.map((review) => {
          const cfg = STATUS_CONFIG[review.status as ReviewStatus] ?? STATUS_CONFIG.not_sent;
          return (
            <div key={review.id} className={cn('rounded-2xl border p-3 transition-all duration-200', cfg.bg)}>
              <div className="flex items-start gap-3">
                <span className={cn('mt-1.5 w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground">{review.reviewer_name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className={cn('h-7 text-[12px] rounded-lg gap-1', cfg.text)}>
                          {cfg.label}
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        {ALL_STATUSES.map(s => (
                          <DropdownMenuItem key={s} onClick={() => updateReview(review.id, { status: s })} className={cn('rounded-lg text-[12px] gap-2', s === review.status && 'font-bold')}>
                            <span className={cn('w-2 h-2 rounded-full', STATUS_CONFIG[s].dot)} />
                            {STATUS_CONFIG[s].label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {editingNote === review.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea value={noteValue} onChange={(e) => setNoteValue(e.target.value)} placeholder="הערה..." className="text-[12px] min-h-[60px] resize-none rounded-lg" autoFocus />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-[12px] rounded-lg px-3" onClick={() => saveNote(review.id)}>שמור</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[12px] rounded-lg" onClick={() => setEditingNote(null)}>ביטול</Button>
                      </div>
                    </div>
                  ) : (
                    <button className="mt-1 text-right w-full" onClick={() => { setEditingNote(review.id); setNoteValue(review.note); }}>
                      {review.note
                        ? <p className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">{review.note}</p>
                        : <p className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">+ הוסף הערה</p>
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
