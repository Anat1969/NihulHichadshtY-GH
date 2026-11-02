import { useState } from 'react';
import { Plus, Trash2, MapPin, Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DbProjectAddress } from '@/hooks/useProjects';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

interface Props {
  projectId: string;
  addresses: DbProjectAddress[];
  addressClusterSummary: string;
  sourceAddressesText: string;
  onAddAddress: (data: TablesInsert<'project_addresses'>) => Promise<void>;
  onUpdateAddress: (id: string, data: TablesUpdate<'project_addresses'>) => Promise<void>;
  onDeleteAddress: (id: string) => Promise<void>;
  onUpdateProject: (updates: { address_cluster_summary?: string; source_addresses_text?: string }) => Promise<void>;
}

export default function ProjectAddressEditor({
  projectId, addresses, addressClusterSummary, sourceAddressesText,
  onAddAddress, onUpdateAddress, onDeleteAddress, onUpdateProject,
}: Props) {
  const [newStreet, setNewStreet] = useState('');
  const [newNumbers, setNewNumbers] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStreet, setEditStreet] = useState('');
  const [editNumbers, setEditNumbers] = useState('');
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(addressClusterSummary);
  const [editingSource, setEditingSource] = useState(false);
  const [sourceDraft, setSourceDraft] = useState(sourceAddressesText);

  const handleAdd = async () => {
    if (!newStreet.trim()) return;
    const numbers = newNumbers.trim() ? newNumbers.split(',').map(n => n.trim()).filter(Boolean) : [];
    await onAddAddress({ project_id: projectId, street_name: newStreet.trim(), building_numbers: numbers });
    setNewStreet('');
    setNewNumbers('');
  };

  const startEdit = (addr: DbProjectAddress) => {
    setEditingId(addr.id);
    setEditStreet(addr.street_name);
    setEditNumbers((addr.building_numbers || []).join(', '));
  };

  const saveEdit = async () => {
    if (!editingId || !editStreet.trim()) return;
    const numbers = editNumbers.trim() ? editNumbers.split(',').map(n => n.trim()).filter(Boolean) : [];
    await onUpdateAddress(editingId, { street_name: editStreet.trim(), building_numbers: numbers });
    setEditingId(null);
  };

  const saveSummary = async () => {
    await onUpdateProject({ address_cluster_summary: summaryDraft });
    setEditingSummary(false);
  };

  const saveSource = async () => {
    await onUpdateProject({ source_addresses_text: sourceDraft });
    setEditingSource(false);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />סיכום כתובות</h3>
          {!editingSummary && (
            <Button variant="ghost" size="sm" onClick={() => { setSummaryDraft(addressClusterSummary); setEditingSummary(true); }} className="h-7 text-[12px] rounded-lg">
              <Edit className="h-3 w-3 ml-1" />עריכה
            </Button>
          )}
        </div>
        {editingSummary ? (
          <div className="space-y-2">
            <Input value={summaryDraft} onChange={e => setSummaryDraft(e.target.value)} className="h-9 rounded-xl text-[13px]" placeholder="למשל: רח׳ מרגנית 1-15, אשדוד" />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveSummary} className="h-7 text-[12px] rounded-lg gap-1"><Check className="h-3 w-3" />שמור</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingSummary(false)} className="h-7 text-[12px] rounded-lg gap-1"><X className="h-3 w-3" />ביטול</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{addressClusterSummary || 'לא הוגדר'}</p>
        )}
      </div>

      {/* Source text */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">טקסט כתובת מקורי</h3>
          {!editingSource && (
            <Button variant="ghost" size="sm" onClick={() => { setSourceDraft(sourceAddressesText); setEditingSource(true); }} className="h-7 text-[12px] rounded-lg">
              <Edit className="h-3 w-3 ml-1" />עריכה
            </Button>
          )}
        </div>
        {editingSource ? (
          <div className="space-y-2">
            <Textarea value={sourceDraft} onChange={e => setSourceDraft(e.target.value)} className="rounded-xl text-[13px] min-h-[60px]" placeholder="הכתובת כפי שמופיעה במסמך המקורי" />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveSource} className="h-7 text-[12px] rounded-lg gap-1"><Check className="h-3 w-3" />שמור</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingSource(false)} className="h-7 text-[12px] rounded-lg gap-1"><X className="h-3 w-3" />ביטול</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{sourceAddressesText || 'לא הוגדר'}</p>
        )}
      </div>

      {/* Addresses list */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-bold mb-4">רחובות ומספרי בניין</h3>
        <div className="space-y-3">
          {addresses.map(addr => (
            <div key={addr.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
              {editingId === addr.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input value={editStreet} onChange={e => setEditStreet(e.target.value)} placeholder="שם רחוב" className="h-8 rounded-lg text-[13px] flex-1" />
                  <Input value={editNumbers} onChange={e => setEditNumbers(e.target.value)} placeholder="מספרים (1, 3, 5)" className="h-8 rounded-lg text-[13px] w-[140px]" />
                  <Button size="sm" onClick={saveEdit} className="h-7 rounded-lg text-[11px] gap-1"><Check className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 rounded-lg text-[11px]"><X className="h-3 w-3" /></Button>
                </div>
              ) : (
                <>
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm font-semibold flex-1">
                    {addr.street_name}
                    {addr.building_numbers && addr.building_numbers.length > 0 && (
                      <span className="text-muted-foreground font-normal mr-2">
                        : {[...addr.building_numbers].sort((a, b) => Number(a) - Number(b)).join(', ')}
                      </span>
                    )}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(addr)} className="h-7 w-7 rounded-lg"><Edit className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteAddress(addr.id)} className="h-7 w-7 rounded-lg text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </>
              )}
            </div>
          ))}

          {/* Add new */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Input value={newStreet} onChange={e => setNewStreet(e.target.value)} placeholder="שם רחוב חדש" className="h-9 rounded-xl text-[13px] flex-1" />
            <Input value={newNumbers} onChange={e => setNewNumbers(e.target.value)} placeholder="מספרים (1, 3, 5)" className="h-9 rounded-xl text-[13px] w-[140px]" />
            <Button size="sm" onClick={handleAdd} disabled={!newStreet.trim()} className="h-9 rounded-xl text-[12px] gap-1.5">
              <Plus className="h-3.5 w-3.5" />הוסף
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
