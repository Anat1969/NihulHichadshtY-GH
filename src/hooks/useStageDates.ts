import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IntelStageDate } from '@/lib/intelligence/engine';

/** Prefix for stage-date queries; StageEditDialog invalidates it after a save. */
export const STAGE_DATES_KEY = ['stage-dates'] as const;

const PAGE = 1000; // PostgREST default max rows per request
const COLUMNS = 'project_id,stage_id,actual_start,actual_end,planned_end';

/**
 * Stage-date rows for analytics — all projects, or one project when `projectId`
 * is given. Selects only the columns the engine reads and pages past the
 * 1000-row PostgREST cap.
 */
export function useAllStageDates(projectId?: string) {
  const { data: stageDates = [], isLoading: loading } = useQuery({
    queryKey: [...STAGE_DATES_KEY, projectId ?? 'all'],
    queryFn: async () => {
      const all: IntelStageDate[] = [];
      for (let from = 0; ; from += PAGE) {
        let q = supabase.from('project_stage_dates').select(COLUMNS).order('id').range(from, from + PAGE - 1);
        if (projectId) q = q.eq('project_id', projectId);
        const { data, error } = await q;
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < PAGE) break;
      }
      return all;
    },
  });
  return { stageDates, loading };
}
