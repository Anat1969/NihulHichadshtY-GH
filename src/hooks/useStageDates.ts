import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type DbStageDate = Tables<'project_stage_dates'>;

const PAGE = 1000; // PostgREST default max rows per request

/**
 * Stage-date rows for analytics — all projects, or one project when `projectId`
 * is given. Pages past the 1000-row PostgREST cap and refetches whenever a
 * `stage-dates-changed` window event fires (dispatched by StageEditDialog).
 */
export function useAllStageDates(projectId?: string) {
  const [stageDates, setStageDates] = useState<DbStageDate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const all: DbStageDate[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = supabase.from('project_stage_dates').select('*').order('id').range(from, from + PAGE - 1);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) { console.error('Error fetching stage dates:', error); break; }
      all.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    return all;
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchAll().then(rows => {
      if (cancelled) return;
      setStageDates(rows);
      setLoading(false);
    });
    load();
    const onChange = (e: Event) => {
      const changed = (e as CustomEvent).detail?.projectId;
      if (!projectId || !changed || changed === projectId) load();
    };
    window.addEventListener('stage-dates-changed', onChange);
    return () => { cancelled = true; window.removeEventListener('stage-dates-changed', onChange); };
  }, [fetchAll, projectId]);

  return { stageDates, loading };
}
