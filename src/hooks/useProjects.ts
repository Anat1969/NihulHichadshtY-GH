import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DbProject = Tables<'projects'>;
export type DbProjectAddress = Tables<'project_addresses'>;
export type ProjectWithAddresses = DbProject & { addresses: DbProjectAddress[] };

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithAddresses[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    const { data: projectsData, error: pErr } = await supabase
      .from('projects')
      .select('*')
      .order('order_index', { ascending: true });

    if (pErr) { console.error('Error fetching projects:', pErr); return; }

    const { data: addressesData, error: aErr } = await supabase
      .from('project_addresses')
      .select('*');

    if (aErr) { console.error('Error fetching addresses:', aErr); return; }

    const merged: ProjectWithAddresses[] = (projectsData || []).map(p => ({
      ...p,
      addresses: (addressesData || []).filter(a => a.project_id === p.id),
    }));

    setProjects(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const addProject = useCallback(async (data: TablesInsert<'projects'>) => {
    const { data: created, error } = await supabase
      .from('projects')
      .insert(data)
      .select()
      .single();
    if (error) { console.error(error); return null; }
    await fetchProjects();
    return created;
  }, [fetchProjects]);

  const updateProject = useCallback(async (id: string, updates: TablesUpdate<'projects'>) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id);
    if (error) {
      console.error('updateProject failed:', error);
      throw error;
    }
    await fetchProjects();
  }, [fetchProjects]);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { console.error(error); return; }
    await fetchProjects();
  }, [fetchProjects]);

  const addAddress = useCallback(async (data: TablesInsert<'project_addresses'>) => {
    const { error } = await supabase.from('project_addresses').insert(data);
    if (error) { console.error(error); return; }
    await fetchProjects();
  }, [fetchProjects]);

  const updateAddress = useCallback(async (id: string, updates: TablesUpdate<'project_addresses'>) => {
    const { error } = await supabase.from('project_addresses').update(updates).eq('id', id);
    if (error) { console.error(error); return; }
    await fetchProjects();
  }, [fetchProjects]);

  const deleteAddress = useCallback(async (id: string) => {
    const { error } = await supabase.from('project_addresses').delete().eq('id', id);
    if (error) { console.error(error); return; }
    await fetchProjects();
  }, [fetchProjects]);

  const reorderProjects = useCallback(async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, i) =>
      supabase.from('projects').update({ order_index: i }).eq('id', id)
    );
    await Promise.all(updates);
    await fetchProjects();
  }, [fetchProjects]);

  return {
    projects, loading, fetchProjects,
    addProject, updateProject, deleteProject,
    addAddress, updateAddress, deleteAddress,
    reorderProjects,
  };
}
