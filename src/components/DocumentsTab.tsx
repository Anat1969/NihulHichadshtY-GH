import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText, Upload, Search, Trash2, Eye, Download, GripVertical,
  Loader2, FileImage, File,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';

interface ProjectAsset {
  id: string;
  projectId: string;
  assetType: 'plan_instructions' | 'drawings' | 'renders';
  fileName: string;
  fileUrl: string;
  fileMime: string;
  fileSize: number;
  uploadedAt: string;
  sortOrder: number;
}

interface LinkedAsset {
  id: string;
  file_path: string;
  asset_type: string;
  description: string | null;
  source: string | null;
  slide_number: number | null;
}

const DOC_TABS = [
  { id: 'identity' as const, label: 'נכסי תעודת זהות', icon: FileImage },
  { id: 'plan_instructions' as const, label: 'הוראות תוכנית', maxFiles: 3, icon: FileText },
  { id: 'drawings' as const, label: 'תשריטים', maxFiles: 3, icon: File },
  { id: 'renders' as const, label: 'הדמיות', maxFiles: 20, icon: FileImage },
];

const ASSET_TYPE_LABELS: Record<string, string> = {
  rendering: 'הדמיה / צילום אווירי',
  map: 'מפת מיקום',
  image: 'תמונה',
  document: 'מסמך',
  info_page: 'דף מידע',
};

const PROJECT_ASSETS_BUCKET = 'project-assets';

const extractProjectAssetPath = (storedPathOrUrl: string): string | null => {
  if (!storedPathOrUrl) return null;
  try {
    const url = new URL(storedPathOrUrl);
    const match = url.pathname.match(/\/object\/(?:public|sign)\/project-assets\/(.+)$/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // Not a URL; treat it as a storage object path below.
  }
  const cleanPath = storedPathOrUrl.replace(/^\/+/, '');
  return cleanPath.startsWith(`${PROJECT_ASSETS_BUCKET}/`)
    ? cleanPath.slice(PROJECT_ASSETS_BUCKET.length + 1)
    : cleanPath;
};

const createProjectAssetSignedUrl = async (asset: ProjectAsset, _download = false) => {
  const path = extractProjectAssetPath(asset.fileUrl);
  if (!path) return asset.fileUrl;
  const { data } = supabase.storage.from(PROJECT_ASSETS_BUCKET).getPublicUrl(path);
  console.info('[DocumentsTab] public URL', { assetId: asset.id, path, publicUrl: data?.publicUrl });
  return data?.publicUrl || asset.fileUrl;
};

export default function DocumentsTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('identity');
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [linkedAssets, setLinkedAssets] = useState<LinkedAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteAsset, setDeleteAsset] = useState<ProjectAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from('project_assets')
        .select('*')
        .eq('project_id', projectId)
        .order('slide_number', { ascending: true });
      if (!data) return;
      const docTypes = ['plan_instructions', 'drawings', 'renders'];
      const docs = (data as any[]).filter(a => docTypes.includes(a.asset_type));
      const linked = (data as any[]).filter(a => !docTypes.includes(a.asset_type));
      setLinkedAssets(linked as LinkedAsset[]);
      setAssets(docs.map((a, idx) => ({
        id: a.id,
        projectId: a.project_id,
        assetType: a.asset_type as ProjectAsset['assetType'],
        fileName: a.description || 'קובץ',
        fileUrl: a.file_path,
        fileMime: '',
        fileSize: 0,
        uploadedAt: a.created_at,
        sortOrder: a.slide_number ?? idx + 1,
      })));
    };
    fetchAll();
  }, [projectId]);

  const getAssets = (type: string) =>
    assets.filter(a => a.assetType === type && a.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleUpload = async (assetType: ProjectAsset['assetType'], maxFiles: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const currentCount = assets.filter(a => a.assetType === assetType).length;
    if (currentCount + files.length > maxFiles) {
      toast({ title: 'שגיאה', description: `ניתן להעלות עד ${maxFiles} קבצים בלשונית זו`, variant: 'destructive' });
      return;
    }
    const ALLOWED_MIME = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-zip-compressed',
      'application/x-rar-compressed', 'application/vnd.rar',
      'application/x-7z-compressed',
    ];
    const ALLOWED_EXT = ['.jpg','.jpeg','.png','.gif','.webp','.svg','.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.txt','.csv','.zip','.rar','.7z','.dwg','.dxf'];
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
        const mimeOk = !file.type || ALLOWED_MIME.includes(file.type);
        const extOk = ALLOWED_EXT.includes(ext);
        if (!mimeOk && !extOk) {
          throw new Error(`סוג קובץ לא נתמך: ${file.name} (${file.type || 'ללא סוג'})`);
        }
        const timestamp = Date.now();
        const safeName = `${timestamp}_${Math.random().toString(36).slice(2)}${ext}`;
        const path = `${projectId}/${assetType}/${safeName}`;
        const isZip = ext === '.zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
        const contentType = isZip ? 'application/zip' : (file.type || 'application/octet-stream');
        const { error } = await supabase.storage
          .from(PROJECT_ASSETS_BUCKET)
          .upload(path, file, { contentType, upsert: true });
        if (error) {
          console.error('[DocumentsTab] storage upload error', {
            message: error.message,
            name: (error as any).name,
            statusCode: (error as any).statusCode,
            error,
            path,
            fileName: file.name,
            contentType,
          });
          throw error;
        }
        const { data: urlData } = supabase.storage.from(PROJECT_ASSETS_BUCKET).getPublicUrl(path);
        console.info('[DocumentsTab] project asset upload path', {
          fileName: file.name,
          storagePath: path,
          storedFilePath: urlData.publicUrl,
        });
        const { data: inserted, error: insertError } = await supabase
          .from('project_assets')
          .insert({
            project_id: projectId,
            file_path: urlData.publicUrl,
            asset_type: assetType,
            description: file.name,
            source: null,
            slide_number: null,
          })
          .select()
          .single();
        if (insertError) {
          console.error('[DocumentsTab] db insert error', { message: insertError.message, insertError });
          throw insertError;
        }
        const newAsset: ProjectAsset = {
          id: inserted?.id || `${timestamp}_${Math.random().toString(36).slice(2)}`,
          projectId,
          assetType,
          fileName: file.name,
          fileUrl: urlData.publicUrl,
          fileMime: file.type,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          sortOrder: currentCount + 1,
        };
        setAssets(prev => [...prev, newAsset]);
      }
      toast({ title: 'הקבצים הועלו בהצלחה' });
    } catch (err: any) {
      const detail = err?.message || err?.error_description || JSON.stringify(err) || 'אירעה שגיאה';
      console.error('[DocumentsTab] upload failed', err);
      toast({ title: 'שגיאה בהעלאה', description: detail, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (asset: ProjectAsset) => {
    try {
      const path = extractProjectAssetPath(asset.fileUrl);
      if (path) {
        await supabase.storage.from(PROJECT_ASSETS_BUCKET).remove([path]);
      }
      await supabase.from('project_assets').delete().eq('file_path', asset.fileUrl);
    } catch (err) {
      console.warn('Failed to delete:', err);
    }
    setAssets(prev => prev.filter(a => a.id !== asset.id));
    setDeleteAsset(null);
    toast({ title: 'הקובץ נמחק בהצלחה' });
  };

  return (
    <div className="space-y-4 pt-2">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="inline-flex h-10 bg-secondary/50 p-1 rounded-xl">
          {DOC_TABS.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 px-3">
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.id === 'identity' && linkedAssets.length > 0 && (
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{linkedAssets.length}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="identity">
          <IdentityAssetsPanel assets={linkedAssets} onPreview={setPreviewUrl} />
        </TabsContent>

        {DOC_TABS.filter(t => t.id !== 'identity').map(tab => (
          <TabsContent key={tab.id} value={tab.id}>
            <DocumentSubTab
              label={tab.label}
              maxFiles={tab.maxFiles!}
              assets={getAssets(tab.id)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onUpload={(files) => handleUpload(tab.id as ProjectAsset['assetType'], tab.maxFiles!, files)}
              uploading={uploading}
              onDelete={setDeleteAsset}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!deleteAsset} onOpenChange={v => { if (!v) setDeleteAsset(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת קובץ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            האם למחוק את הקובץ <strong>{deleteAsset?.fileName}</strong>?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteAsset(null)}>ביטול</Button>
            <Button variant="destructive" onClick={() => deleteAsset && handleDelete(deleteAsset)}>מחק</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function IdentityAssetsPanel({ assets, onPreview }: { assets: LinkedAsset[]; onPreview: (url: string) => void }) {
  if (assets.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="py-12 text-center">
          <FileImage className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">לא קושרו נכסי תעודת זהות לפרויקט זה</p>
        </CardContent>
      </Card>
    );
  }
  const mainImages = assets.filter(a => a.asset_type === 'rendering');
  const maps = assets.filter(a => a.asset_type === 'map');
  const others = assets.filter(a => a.asset_type !== 'rendering' && a.asset_type !== 'map');

  return (
    <div className="mt-4 space-y-4">
      {mainImages.length > 0 && (
        <Section title="הדמיות וצילומי אוויר">{mainImages.map(a => <AssetCard key={a.id} asset={a} onPreview={onPreview} />)}</Section>
      )}
      {maps.length > 0 && (
        <Section title="מפות">{maps.map(a => <AssetCard key={a.id} asset={a} onPreview={onPreview} />)}</Section>
      )}
      {others.length > 0 && (
        <Section title="נכסים נוספים">{others.map(a => <AssetCard key={a.id} asset={a} onPreview={onPreview} />)}</Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function AssetCard({ asset, onPreview }: { asset: LinkedAsset; onPreview: (url: string) => void }) {
  return (
    <Card className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow" onClick={() => onPreview(asset.file_path)}>
      <div className="relative aspect-video bg-muted">
        <img src={asset.file_path} alt={asset.description || 'נכס פרויקט'} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <CardContent className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{asset.description || 'נכס פרויקט'}</span>
          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
            {ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}
          </span>
        </div>
        {asset.source && <p className="text-[10px] text-muted-foreground truncate">מקור: {asset.source}</p>}
      </CardContent>
    </Card>
  );
}

function DocumentSubTab({
  label, maxFiles, assets, searchQuery, onSearchChange, onUpload, uploading, onDelete,
}: {
  label: string;
  maxFiles: number;
  assets: ProjectAsset[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onUpload: (files: FileList | null) => void;
  uploading?: boolean;
  onDelete: (a: ProjectAsset) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div className="space-y-4 pt-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => onSearchChange(e.target.value)} placeholder="חיפוש לפי שם קובץ..." className="pr-10 h-9" />
        </div>
        <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.dwg,.dxf" className="hidden" onChange={e => { onUpload(e.target.files); e.target.value = ''; }} />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2 h-9">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          העלה קבצים
        </Button>
        <span className="text-xs text-muted-foreground">{assets.length}/{maxFiles} קבצים</span>
      </div>

      {assets.length === 0 ? (
        <Card
          className={`border-dashed border-2 transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border/60'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); onUpload(e.dataTransfer.files); }}
        >
          <CardContent className="py-16 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground/70">אין קבצים</p>
            <p className="text-sm text-muted-foreground/50 mt-1">גרור קבצים לכאן או לחץ "העלה קבצים"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assets.map(asset => (
            <Card key={asset.id} className="transition-all duration-150 hover:shadow-md">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab shrink-0" />
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.fileName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(asset.uploadedAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="צפייה" onClick={async () => {
                    const url = await createProjectAssetSignedUrl(asset);
                    const a = document.createElement('a');
                    a.href = url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="הורדה" onClick={async () => {
                    const url = await createProjectAssetSignedUrl(asset, true);
                    const a = document.createElement('a');
                    a.href = url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.download = asset.fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="מחיקה" onClick={() => onDelete(asset)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
