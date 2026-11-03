import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State { error: Error | null }

/** Catches render errors so one broken screen never blanks the whole app. */
class Boundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div dir="rtl" className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="premium-card max-w-md w-full p-8 text-center space-y-4">
          <AlertOctagon className="h-10 w-10 mx-auto text-destructive" />
          <h1 className="text-lg font-bold">משהו השתבש במסך הזה</h1>
          <p className="text-[13px] text-muted-foreground break-words">{error.message}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => this.setState({ error: null })} className="gap-1.5 rounded-xl">
              <RotateCcw className="h-4 w-4" />נסה שוב
            </Button>
            <Button variant="outline" asChild className="rounded-xl">
              <a href={import.meta.env.BASE_URL}>לדשבורד</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

/** Per-route error boundary: navigating to another page clears the error. */
export default function ErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}
