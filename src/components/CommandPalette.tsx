import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { FolderKanban, ClipboardList, FileBarChart, LayoutDashboard, CalendarDays, Bell, Search, Radar } from 'lucide-react';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { projects } = useProjects();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="חיפוש פעולה..." />
      <CommandList>
        <CommandEmpty>לא נמצאו תוצאות</CommandEmpty>
        <CommandGroup heading="ניווט מהיר">
          <CommandItem onSelect={() => go('/')}><LayoutDashboard className="ml-2 h-4 w-4" />דשבורד</CommandItem>
          <CommandItem onSelect={() => go('/command-center')}><Radar className="ml-2 h-4 w-4" />מרכז פיקוד חכם</CommandItem>
          <CommandItem onSelect={() => go('/projects')}><FolderKanban className="ml-2 h-4 w-4" />פרויקטים</CommandItem>
          <CommandItem onSelect={() => go('/tasks')}><ClipboardList className="ml-2 h-4 w-4" />משימות</CommandItem>
          <CommandItem onSelect={() => go('/meetings')}><CalendarDays className="ml-2 h-4 w-4" />ישיבות</CommandItem>
          <CommandItem onSelect={() => go('/reminders')}><Bell className="ml-2 h-4 w-4" />תזכורות</CommandItem>
          <CommandItem onSelect={() => go('/reports')}><FileBarChart className="ml-2 h-4 w-4" />דוחות</CommandItem>
        </CommandGroup>
        <CommandGroup heading="פעולות מהירות">
          <CommandItem onSelect={() => go('/projects?action=new')}><FolderKanban className="ml-2 h-4 w-4" />צור פרויקט חדש</CommandItem>
          <CommandItem onSelect={() => go('/reminders?action=new')}><Bell className="ml-2 h-4 w-4" />צור תזכורת חדשה</CommandItem>
        </CommandGroup>
        {projects.length > 0 && (
          <CommandGroup heading="פרויקטים">
            {projects.map(p => (
              <CommandItem key={p.id} onSelect={() => go(`/project/${p.id}`)}>
                <Search className="ml-2 h-4 w-4" />{p.project_name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
