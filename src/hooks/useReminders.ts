import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DbReminder = Tables<'reminders'>;

export function useReminders() {
  const [reminders, setReminders] = useState<DbReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .order('due_at', { ascending: true, nullsFirst: false });
    if (error) { console.error('Error fetching reminders:', error); setLoading(false); return; }
    setReminders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  const addReminder = useCallback(async (data: TablesInsert<'reminders'>) => {
    const { data: created, error } = await supabase.from('reminders').insert(data).select().single();
    if (error) { console.error(error); return null; }
    await fetchReminders();
    return created;
  }, [fetchReminders]);

  const updateReminder = useCallback(async (id: string, updates: TablesUpdate<'reminders'>) => {
    const { error } = await supabase.from('reminders').update(updates).eq('id', id);
    if (error) { console.error(error); return; }
    await fetchReminders();
  }, [fetchReminders]);

  const deleteReminder = useCallback(async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) { console.error(error); return; }
    await fetchReminders();
  }, [fetchReminders]);

  return { reminders, loading, fetchReminders, addReminder, updateReminder, deleteReminder };
}
