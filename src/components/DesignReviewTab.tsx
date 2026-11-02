import { useState } from 'react';
import { useForumChecks } from '@/hooks/useForumData';
import { CHECK_STATUS_LABELS, type CheckStatus } from '@/types/project';
import { Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<CheckStatus, { label: string; dot: string; ring: string; bg: string }> = {
  green:  { label: CHECK_STATUS_LABELS.green,  dot: 'bg-[hsl(var(--status-green))]',  ring: 'ring-green-200',  bg: 'bg-emerald-50/60 border-emerald-100' },
  yellow: { label: CHECK_STATUS_LABELS.yellow, dot: 'bg-[hsl(var(--status-yellow))]', ring: 'ring-orange-200', bg: 'bg-orange-50/60 border-orange-100' },
  red:    { label: CHECK_STATUS_LABELS.red,    dot: 'bg-[hsl(var(--status-red))]',    ring: 'ring-red-200',    bg: 'bg-red-50/60 border-red-100' },
};

const ORDER: CheckStatus[] = ['green', 'yellow', 'red'];

export default function DesignReviewTab({ projectId }: { projectId: string }) {
  const { checks, loading, updateCheck } = useForumChecks(projectId);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const countByStatus = (s: CheckStatus) => checks.filter(c => c.status === s).length;
  const redCount = countByStatus('red');
  const greenCount = countByStatus('green');

  const handleCycleStatus = (id: string, current: CheckStatus) => {
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    updateCheck(id, { status: next });
  };

  const startEditNote = (id: string, current: string) => {
    setEditingNote(id);
    setNoteValue(current);
  };

  const saveNote = (id: string) => {
    updateCheck(id, { note: noteValue });
    setEditingNote(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="h-4 w-4 text-muted-foreground" />
          בקרת תכן – פורום 1
        </div>
        <div className="flex flex-wrap gap-2">
          {(['green', 'yellow', 'red'] as CheckStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5 text-[12px] text-muted-foreground bg-secondary/60 rounded-full px-2.5 py-1">
              <span className={cn('w-2 h-2 rounded-full', STATUS_CONFIG[s].dot)} />
              {STATUS_CONFIG[s].label}
              <span className="font-bold text-foreground">{countByStatus(s)}</span>
            </div>
          ))}
        </div>
        {redCount > 0 && (
          <div className="text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 inline-block w-fit">
            {redCount} סעיפים אדומים – לא מוכן לפורום 3
          </div>
        )}
        {redCount === 0 && greenCount === checks.length && checks.length > 0 && (
          <div className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 inline-block w-fit">כל הסעיפים ירוקים ✓</div>
        )}
      </div>

      <div className="space-y-2">
        {checks.map((check) => {
          const cfg = STATUS_CONFIG[check.status as CheckStatus] ?? STATUS_CONFIG.yellow;
          return (
            <div key={check.id} className={cn('rounded-2xl border p-3 transition-all duration-200', cfg.bg)}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleCycleStatus(check.id, check.status as CheckStatus)}
                  title="לחץ לשינוי סטטוס"
                  className={cn('mt-0.5 w-5 h-5 rounded-full shrink-0 ring-4 transition-all duration-200 hover:scale-110 cursor-pointer', cfg.dot, cfg.ring)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground">{check.name}</span>
                    <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
                  </div>
                  {editingNote === check.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea value={noteValue} onChange={(e) => setNoteValue(e.target.value)} placeholder="הערה..." className="text-[12px] min-h-[60px] resize-none rounded-lg" autoFocus />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-[12px] rounded-lg px-3" onClick={() => saveNote(check.id)}>שמור</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[12px] rounded-lg" onClick={() => setEditingNote(null)}>ביטול</Button>
                      </div>
                    </div>
                  ) : (
                    <button className="mt-1 text-right w-full" onClick={() => startEditNote(check.id, check.note)}>
                      {check.note
                        ? <p className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">{check.note}</p>
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
