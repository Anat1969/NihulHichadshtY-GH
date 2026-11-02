import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TamaSite {
  id: string;
  building_number: string | null;
  request_number: string | null;
  site_address: string;
  quarter: string | null;
  cranes_count: string | null;
  building_type: string | null;
  permit_description: string | null;
  contact_person: string | null;
  phone: string | null;
  construction_status: string | null;
  notes: string | null;
  permit_validity: string | null;
  yuval_notes: string | null;
  cranes_text: string | null;
  review_status: string;
  review_note: string;
  is_anomaly: boolean;
  source_row_index: number | null;
  created_at: string;
  updated_at: string;
}

export const TAMA_REVIEW_STATUSES = [
  'תקין',
  'דורש בדיקה',
  'פג תוקף / לבדיקה',
  'חסר מידע',
  'בביקורת שטח',
  'הושלם',
] as const;

export function useTamaSites() {
  const [sites, setSites] = useState<TamaSite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tama_sites')
      .select('*')
      .order('quarter', { ascending: true })
      .order('site_address', { ascending: true });
    if (!error && data) setSites(data as TamaSite[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const updateReview = useCallback(async (id: string, patch: { review_status?: string; review_note?: string }) => {
    const { error } = await supabase.from('tama_sites').update(patch).eq('id', id);
    if (error) throw error;
    setSites(prev => prev.map(s => s.id === id ? { ...s, ...patch } as TamaSite : s));
  }, []);

  return { sites, loading, refetch: fetchSites, updateReview };
}

// Parse Israeli date formats: dd.mm.yy or dd.mm.yyyy or d.m.yy
export function parsePermitDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  const date = new Date(y, mo - 1, d);
  if (isNaN(date.getTime())) return null;
  return date;
}

export function permitValidityCategory(raw: string | null | undefined): 'expired' | 'soon' | 'valid' | 'missing' {
  const date = parsePermitDate(raw);
  if (!date) return 'missing';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'expired';
  if (diff <= 90) return 'soon';
  return 'valid';
}
