import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DbTask = Tables<'tasks'>;

/** Prefix shared by all task queries, so one invalidation refreshes every view. */
export const TASKS_KEY = ['tasks'] as const;

/** Tasks (all, or one project's) via the shared React Query cache. */
export function useTasks(projectId?: string) {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading: loading } = useQuery({
    queryKey: [...TASKS_KEY, projectId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const fetchTasks = useCallback(
    () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
    [queryClient],
  );

  const addTask = useCallback(async (data: TablesInsert<'tasks'>) => {
    const { data: created, error } = await supabase.from('tasks').insert(data).select().single();
    if (error) { console.error(error); return null; }
    await fetchTasks();
    return created;
  }, [fetchTasks]);

  const updateTask = useCallback(async (id: string, updates: TablesUpdate<'tasks'>) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) { console.error(error); return; }
    await fetchTasks();
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) { console.error(error); return; }
    await fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, fetchTasks, addTask, updateTask, deleteTask };
}
