import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type DbAuditEntry = Tables<'audit_log'>;

export function useAuditLog() {
  const [entries, setEntries] = useState<DbAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) { console.error('Error fetching audit log:', error); setLoading(false); return; }
    setEntries(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = useCallback(async (data: TablesInsert<'audit_log'>) => {
    const { error } = await supabase.from('audit_log').insert(data);
    if (error) { console.error(error); return; }
    await fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, fetchEntries, addEntry };
}
