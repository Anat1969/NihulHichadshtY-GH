import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FORUM1_CHECK_ITEMS, FORUM2_REVIEWERS } from '@/types/project';

export interface DbForum1Check {
  id: string;
  project_id: string;
  item_index: number;
  name: string;
  status: 'red' | 'yellow' | 'green';
  note: string;
  created_at: string;
  updated_at: string;
}

export interface DbForum2Review {
  id: string;
  project_id: string;
  reviewer_name: string;
  status: 'not_sent' | 'sent' | 'received' | 'fix_required' | 'approved';
  note: string;
  created_at: string;
  updated_at: string;
}

export function useForumChecks(projectId: string) {
  const [checks, setChecks] = useState<DbForum1Check[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChecks = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('forum1_checks')
      .select('*')
      .eq('project_id', projectId)
      .order('item_index', { ascending: true });

    if (error) { console.error('Error fetching checks:', error); setLoading(false); return; }

    if (!data || data.length === 0) {
      const rows = FORUM1_CHECK_ITEMS.map((name, i) => ({
        project_id: projectId,
        item_index: i,
        name,
        status: 'yellow' as const,
        note: '',
      }));
      const { data: seeded, error: seedErr } = await (supabase as any)
        .from('forum1_checks')
        .insert(rows)
        .select();
      if (seedErr) { console.error('Error seeding checks:', seedErr); }
      setChecks((seeded as DbForum1Check[]) || []);
    } else {
      setChecks(data as DbForum1Check[]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchChecks(); }, [fetchChecks]);

  const updateCheck = useCallback(async (
    id: string,
    updates: Partial<Pick<DbForum1Check, 'status' | 'note'>>
  ) => {
    const { error } = await (supabase as any)
      .from('forum1_checks')
      .update(updates)
      .eq('id', id);
    if (error) { console.error(error); return; }
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  return { checks, loading, updateCheck, refetch: fetchChecks };
}

export function useForumReviews(projectId: string) {
  const [reviews, setReviews] = useState<DbForum2Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('forum2_reviews')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) { console.error('Error fetching reviews:', error); setLoading(false); return; }

    if (!data || data.length === 0) {
      const rows = FORUM2_REVIEWERS.map(name => ({
        project_id: projectId,
        reviewer_name: name,
        status: 'not_sent' as const,
        note: '',
      }));
      const { data: seeded, error: seedErr } = await (supabase as any)
        .from('forum2_reviews')
        .insert(rows)
        .select();
      if (seedErr) { console.error('Error seeding reviews:', seedErr); }
      setReviews((seeded as DbForum2Review[]) || []);
    } else {
      setReviews(data as DbForum2Review[]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const updateReview = useCallback(async (
    id: string,
    updates: Partial<Pick<DbForum2Review, 'status' | 'note'>>
  ) => {
    const { error } = await (supabase as any)
      .from('forum2_reviews')
      .update(updates)
      .eq('id', id);
    if (error) { console.error(error); return; }
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  return { reviews, loading, updateReview, refetch: fetchReviews };
}
