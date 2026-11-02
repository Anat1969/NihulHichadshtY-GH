import Layout from '@/components/Layout';
import { FileArchive, Construction } from 'lucide-react';

export default function BuildingPlanPage() {
  return (
    <Layout>
      <div className="max-w-[1320px] mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <FileArchive className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">תכנית בניינית 603-0972307</h1>
            <p className="text-sm text-muted-foreground mt-1">
              תכנית עירונית להתחדשות בניינים טעונים חיזוק ומיגון – אשדוד
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'מיגון מבנים קיימים', desc: 'תוספת קומה טיפוסית מורחבת וקומת גג חלקית', color: 'bg-blue-50 border-blue-200 text-blue-800' },
            { label: 'חיזוק ומיגון מבנים קיימים', desc: 'סגירת קומה מפולשת, הרחבת קומות, תוספת 2–3 קומות', color: 'bg-orange-50 border-orange-200 text-orange-800' },
            { label: 'הריסה ובנייה מחדש', desc: 'זכויות לפי טבלה 5, עד 16 קומות לפי מצב קיים', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
          ].map(track => (
            <div key={track.label} className={`rounded-2xl border p-4 ${track.color}`}>
              <h3 className="font-bold text-sm mb-1">{track.label}</h3>
              <p className="text-xs leading-relaxed opacity-80">{track.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/40 bg-card p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Construction className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold mb-2">ניהול בניינים — בפיתוח</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            ניהול בניינים לפי מסלול, שלב, יזם ואדריכל יתווסף בקרוב.
            התכנית אושרה ב-30/12/2025, תוקף 5 שנים.
          </p>
        </div>
      </div>
    </Layout>
  );
}
