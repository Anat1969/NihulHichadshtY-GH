import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from '@/components/Layout';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center mb-8">
          <span className="text-5xl font-black text-muted-foreground/20">404</span>
        </div>
        <h1 className="text-2xl font-extrabold mb-3">הדף לא נמצא</h1>
        <p className="text-muted-foreground mb-8">הדף שחיפשת אינו קיים או שהוסר</p>
        <Link to="/">
          <Button className="gap-2.5 h-11 rounded-xl text-[14px] px-6 shadow-sm press-scale">
            <Home className="h-4 w-4" />
            חזרה לדשבורד
          </Button>
        </Link>
      </div>
    </Layout>
  );
};

export default NotFound;
