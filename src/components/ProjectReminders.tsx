import { useState } from 'react';
import { useApp } from '@/context/ProjectContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, CheckCircle2, Circle, Clock, Bell } from 'lucide-react';

export default function ProjectReminders({ projectId }: { projectId: string }) {
  const { reminders, addReminder, updateReminder } = useApp();
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');

  const projectReminders = reminders
    .filter(r => r.projectId === projectId)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const handleAdd = () => {
    if (!title.trim() || !dueAt) return;
    addReminder({ title: title.trim(), dueAt, projectId, status: 'open', priority: 'normal', createdAt: new Date().toISOString() });
    setTitle(''); setDueAt('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          תזכורות לפרויקט
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="תזכורת חדשה..." className="flex-1 h-9" />
          <Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} className="w-auto h-9" />
          <Button size="sm" onClick={handleAdd} className="h-9"><Plus className="h-4 w-4" /></Button>
        </div>
        {projectReminders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין תזכורות לפרויקט זה</p>
        ) : (
          <div className="space-y-1.5">
            {projectReminders.map(r => (
              <div key={r.id} className={`flex items-center gap-2 text-sm p-2.5 rounded-lg bg-secondary/30 transition-all duration-150 ${r.status === 'done' ? 'opacity-50' : ''}`}>
                <button onClick={() => updateReminder(r.id, { status: r.status === 'open' ? 'done' : 'open' })} className="transition-transform hover:scale-110">
                  {r.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-status-green" /> : <Circle className="h-4 w-4 text-muted-foreground/40" />}
                </button>
                <span className={`flex-1 ${r.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{r.title}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{r.dueAt.split('T')[0]}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
