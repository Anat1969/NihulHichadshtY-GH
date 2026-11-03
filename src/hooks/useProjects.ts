import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DbProject = Tables<'projects'>;
export type DbProjectAddress = Tables<'project_addresses'>;
export type ProjectWithAddresses = DbProject & { addresses: DbProjectAddress[] };

export const PROJECTS_KEY = ['projects'] as const;

async function fetchProjectsWithAddresses(): Promise<ProjectWithAddresses[]> {
  const [{ data: projectsData, error: pErr }, { data: addressesData, error: aErr }] = await Promise.all([
    supabase.from('projects').select('*').order('order_index', { ascending: true }),
    supabase.from('project_addresses').select('*'),
  ]);
  if (pErr) throw pErr;
  if (aErr) throw aErr;
  const byProject = new Map<string, DbProjectAddress[]>();
  for (const a of addressesData || []) byProject.set(a.project_id, [...(byProject.get(a.project_id) || []), a]);
  return (projectsData || []).map(p => ({ ...p, addresses: byProject.get(p.id) || [] }));
}

/**
 * Projects (with addresses) from Supabase, shared through the React Query
 * cache: every component calling this hook reuses one request, and mutations
 * invalidate the cache so all screens refresh together.
 */
export function useProjects() {
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: fetchProjectsWithAddresses,
  });

  const fetchProjects = useCallback(
    () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }),
    [queryClient],
  );

  /** Runs a write; logs (or rethrows) its error, then refreshes the cache. */
  const write = useCallback(
    async <T,>(op: PromiseLike<{ data?: T; error: unknown }>, rethrow = false): Promise<T | null> => {
      const { data, error } = await op;
      if (error) {
        console.error('Project write failed:', error);
        if (rethrow) throw error;
        return null;
      }
      await fetchProjects();
      return (data ?? null) as T | null;
    },
    [fetchProjects],
  );

  const addProject = useCallback(
    (data: TablesInsert<'projects'>) => write(supabase.from('projects').insert(data).select().single()),
    [write],
  );
  const updateProject = useCallback(
    async (id: string, updates: TablesUpdate<'projects'>) => {
      await write(supabase.from('projects').update(updates).eq('id', id), true);
    },
    [write],
  );
  const deleteProject = useCallback(
    async (id: string) => { await write(supabase.from('projects').delete().eq('id', id)); },
    [write],
  );
  const addAddress = useCallback(
    async (data: TablesInsert<'project_addresses'>) => { await write(supabase.from('project_addresses').insert(data)); },
    [write],
  );
  const updateAddress = useCallback(
    async (id: string, updates: TablesUpdate<'project_addresses'>) => {
      await write(supabase.from('project_addresses').update(updates).eq('id', id));
    },
    [write],
  );
  const deleteAddress = useCallback(
    async (id: string) => { await write(supabase.from('project_addresses').delete().eq('id', id)); },
    [write],
  );
  const reorderProjects = useCallback(async (orderedIds: string[]) => {
    await Promise.all(orderedIds.map((id, i) => supabase.from('projects').update({ order_index: i }).eq('id', id)));
    await fetchProjects();
  }, [fetchProjects]);

  return {
    projects, loading, fetchProjects,
    addProject, updateProject, deleteProject,
    addAddress, updateAddress, deleteAddress,
    reorderProjects,
  };
}
