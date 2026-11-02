import Layout from '@/components/Layout';
import { Shield } from 'lucide-react';

export default function UsersPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1>משתמשים</h1>
            <p className="caption mt-1">ניהול הרשאות ותפקידים</p>
          </div>
        </div>

        <div className="premium-card border-dashed border-2 border-border">
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Shield className="h-7 w-7 text-muted-foreground/25" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground/50">ניהול משתמשים</p>
            <p className="caption mt-1">נדרש אימות משתמשים להפעלת מודול זה</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
