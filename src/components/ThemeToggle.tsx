import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="h-9 w-9 p-0 rounded-xl border border-border/40 hover:border-primary/20 text-muted-foreground print:hidden"
      title={dark ? 'מצב בהיר' : 'מצב כהה'}
      aria-label={dark ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
