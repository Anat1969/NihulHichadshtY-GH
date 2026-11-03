import { useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAllStageDates } from '@/hooks/useStageDates';
import { analyzePortfolio } from '@/lib/intelligence/engine';

/** Live portfolio analytics computed from Supabase projects, tasks and stage dates. */
export function usePortfolioIntelligence() {
  const { projects, loading: pl } = useProjects();
  const { tasks, loading: tl } = useTasks();
  const { stageDates, loading: sl } = useAllStageDates();

  const insights = useMemo(
    () => analyzePortfolio(projects, { tasks, stageDates }),
    [projects, tasks, stageDates],
  );

  return { insights, loading: pl || tl || sl };
}
