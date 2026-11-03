import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertOctagon, RotateCcw } from 'lucide-react';

/** A lazy chunk that 404s after a new deploy — only a full reload can fix it. */
function isChunkLoadError(e: Error) {
  return /dynamically imported module|Importing a module script failed|Loading chunk/i.test(e.message);
}

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
    if (!this.state.error) return this.props.children;
    return (
      <div dir="rtl" className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="premium-card max-w-md w-full p-8 text-center space-y-4">
          <AlertOctagon className="h-10 w-10 mx-auto text-destructive" />
          <h1 className="text-lg font-bold">{isChunkLoadError(this.state.error) ? 'יצאה גרסה חדשה של המערכת' : 'משהו השתבש במסך הזה'}</h1>
          <p className="text-[13px] text-muted-foreground break-words">
            {isChunkLoadError(this.state.error) ? 'יש לרענן את הדף כדי לטעון את הגרסה העדכנית.' : this.state.error.message}
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => (isChunkLoadError(this.state.error!) ? window.location.reload() : this.setState({ error: null }))} className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-[13px] font-bold">
              <RotateCcw className="h-4 w-4" />נסה שוב
            </button>
            <a href={import.meta.env.BASE_URL} className="inline-flex items-center rounded-xl border px-4 py-2 text-[13px]">לדשבורד</a>
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
