import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DbMeeting = Tables<'meetings'>;
export type DbDecision = Tables<'decisions'>;

export function useMeetings(projectId?: string) {
  const [meetings, setMeetings] = useState<DbMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = useCallback(async () => {
    let query = supabase.from('meetings').select('*').order('date', { ascending: false, nullsFirst: false });
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) { console.error('Error fetching meetings:', error); setLoading(false); return; }
    setMeetings(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const addMeeting = useCallback(async (data: TablesInsert<'meetings'>) => {
    const { data: created, error } = await supabase.from('meetings').insert(data).select().single();
    if (error) { console.error(error); return null; }
    await fetchMeetings();
    return created;
  }, [fetchMeetings]);

  const updateMeeting = useCallback(async (id: string, updates: TablesUpdate<'meetings'>) => {
    const { error } = await supabase.from('meetings').update(updates).eq('id', id);
    if (error) { console.error(error); return; }
    await fetchMeetings();
  }, [fetchMeetings]);

  const deleteMeeting = useCallback(async (id: string) => {
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) { console.error(error); return; }
    await fetchMeetings();
  }, [fetchMeetings]);

  return { meetings, loading, fetchMeetings, addMeeting, updateMeeting, deleteMeeting };
}

export function useMeeting(meetingId?: string) {
  const [meeting, setMeeting] = useState<DbMeeting | null>(null);
  const [decisions, setDecisions] = useState<DbDecision[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!meetingId) { setLoading(false); return; }
    const { data: m } = await supabase.from('meetings').select('*').eq('id', meetingId).maybeSingle();
    setMeeting(m);
    const { data: d } = await supabase.from('decisions').select('*').eq('meeting_id', meetingId).order('number');
    setDecisions(d || []);
    setLoading(false);
  }, [meetingId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateMeeting = useCallback(async (updates: TablesUpdate<'meetings'>) => {
    if (!meetingId) return;
    const { error } = await supabase.from('meetings').update(updates).eq('id', meetingId);
    if (error) { console.error(error); return; }
    await fetchAll();
  }, [meetingId, fetchAll]);

  const addDecision = useCallback(async (text: string) => {
    if (!meetingId || !meeting) return;
    const number = decisions.length + 1;
    const { error } = await supabase.from('decisions').insert({
      meeting_id: meetingId, project_id: meeting.project_id, number, text,
    });
    if (error) { console.error(error); return; }
    await fetchAll();
  }, [meetingId, meeting, decisions.length, fetchAll]);

  return { meeting, decisions, loading, updateMeeting, addDecision, refetch: fetchAll };
}
