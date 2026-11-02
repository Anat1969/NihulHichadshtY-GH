import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DbTask = Tables<'tasks'>;

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) { console.error('Error fetching tasks:', error); setLoading(false); return; }
    setTasks(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

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
