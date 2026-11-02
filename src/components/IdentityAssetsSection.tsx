import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileImage, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LinkedAsset {
  id: string;
  file_path: string;
  asset_type: string;
  description: string | null;
  source: string | null;
  slide_number: number | null;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  rendering: 'הדמיה / צילום אווירי',
  map: 'מפת מיקום',
  image: 'תמונה',
  document: 'מסמך',
  info_page: 'דף מידע',
};

const ASSET_GROUP_TITLES: Record<string, string> = {
  rendering: 'הדמיות וצילומי אוויר',
  map: 'מפות',
  info_page: 'דפי מידע',
  image: 'תמונות',
  document: 'מסמכים',
};

export default function IdentityAssetsSection({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<LinkedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('project_assets')
        .select('*')
        .eq('project_id', projectId)
        .order('slide_number', { ascending: true });
      if (!cancelled) {
        setAssets((data as LinkedAsset[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) {
    return (
      <div className="premium-card p-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="premium-card p-12 text-center">
        <FileImage className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <p className="text-base font-semibold text-muted-foreground">לא קושרו נכסי תעודת זהות לפרויקט זה</p>
        <p className="text-sm text-muted-foreground/60 mt-1">הדמיות, מפות ודפי מידע יוצגו כאן ברגע שיקושרו</p>
      </div>
    );
  }

  // Group by asset_type, preserving a sensible order
  const order = ['rendering', 'map', 'info_page', 'image', 'document'];
  const groups = order
    .map(type => ({ type, items: assets.filter(a => a.asset_type === type) }))
    .filter(g => g.items.length > 0);
  const knownTypes = new Set(order);
  const others = assets.filter(a => !knownTypes.has(a.asset_type));
  if (others.length > 0) groups.push({ type: 'other', items: others });

  return (
    <div className="space-y-6">
      {groups.map(g => (
        <div key={g.type} className="space-y-3">
          <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">
            {ASSET_GROUP_TITLES[g.type] || 'נכסים נוספים'}
            <span className="mr-2 text-[11px] text-muted-foreground/60 font-normal">({g.items.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.items.map(asset => (
              <Card
                key={asset.id}
                className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setPreviewUrl(asset.file_path)}
              >
                <div className="relative aspect-video bg-muted">
                  <img
                    src={asset.file_path}
                    alt={asset.description || 'נכס פרויקט'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center">
                    <Eye className="h-6 w-6 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{asset.description || 'נכס פרויקט'}</span>
                    <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground shrink-0">
                      {ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}
                    </span>
                  </div>
                  {asset.source && (
                    <p className="text-[10px] text-muted-foreground truncate">מקור: {asset.source}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={!!previewUrl} onOpenChange={v => { if (!v) setPreviewUrl(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <DialogHeader>
            <DialogTitle>תצוגה מקדימה</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="תצוגה מקדימה" className="w-full h-auto max-h-[75vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
