import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ArrowLeft, Activity, Clock, AlertTriangle } from 'lucide-react';
import { useTamaSites, permitValidityCategory } from '@/hooks/useTamaSites';
import { useMemo } from 'react';

export default function TamaDashboardCard() {
  const navigate = useNavigate();
  const { sites, loading } = useTamaSites();

  const stats = useMemo(() => {
    const total = sites.length;
    const active = sites.filter(s => s.construction_status === 'אתר פעיל').length;
    const notStarted = sites.filter(s => s.construction_status === 'טרם החלו בבניה').length;
    const expired = sites.filter(s => permitValidityCategory(s.permit_validity) === 'expired').length;
    return { total, active, notStarted, expired };
  }, [sites]);

  return (
    <Card className="border-border/40 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate('/tama')}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">תמ״א בביצוע</h3>
              <p className="text-[11px] text-muted-foreground">אתרי בנייה פעילים בעיר</p>
            </div>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-all" />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Stat label="סה״כ" value={loading ? '—' : stats.total} color="text-foreground" />
          <Stat label="פעילים" value={loading ? '—' : stats.active} color="text-emerald-600" icon={Activity} />
          <Stat label="טרם החלו" value={loading ? '—' : stats.notStarted} color="text-slate-500" icon={Clock} />
          <Stat label="פג תוקף" value={loading ? '—' : stats.expired} color="text-rose-600" icon={AlertTriangle} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon?: any }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
      <div className={`text-lg font-extrabold ${color} flex items-center justify-center gap-1`}>
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
