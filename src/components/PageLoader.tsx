import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Centered spinner for route / data loading, with an optional caption. */
export default function PageLoader({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-muted-foreground', className ?? 'h-72')} aria-busy="true">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {message && <span className="text-[13px]">{message}</span>}
    </div>
  );
}
