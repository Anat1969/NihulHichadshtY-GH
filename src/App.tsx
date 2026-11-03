import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/ProjectContext";
import CommandPalette from "@/components/CommandPalette";
import SmartAssistant from "@/components/SmartAssistant";
import Index from "./pages/Index";
const ProjectPage = lazy(() => import("./pages/ProjectPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const MeetingsPage = lazy(() => import("./pages/MeetingsPage"));
const MeetingPage = lazy(() => import("./pages/MeetingPage"));
const Neighborhood360Page = lazy(() => import("./pages/Neighborhood360Page"));
const RemindersPage = lazy(() => import("./pages/RemindersPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const PlanGuidePage = lazy(() => import("./pages/PlanGuidePage"));
const TamaPage = lazy(() => import("./pages/TamaPage"));
const TamaSitePage = lazy(() => import("./pages/TamaSitePage"));
const BuildingPlanPage = lazy(() => import("./pages/BuildingPlanPage"));
const GanttAllProjectsPage = lazy(() => import("./pages/GanttAllProjectsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CommandCenterPage = lazy(() => import("./pages/CommandCenterPage"));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center" aria-busy="true">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="nihul-theme">
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || undefined}>
          <CommandPalette />
          <SmartAssistant />
          <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/command-center" element={<CommandCenterPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/plan-guide" element={<PlanGuidePage />} />
            <Route path="/tama" element={<TamaPage />} />
            <Route path="/tama/:id" element={<TamaSitePage />} />
            <Route path="/building-plan" element={<BuildingPlanPage />} />
            <Route path="/gantt-all" element={<GanttAllProjectsPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/project/:id" element={<ProjectPage />} />
            <Route path="/project/:id/meeting/:meetingId" element={<MeetingPage />} />
            <Route path="/project/:id/360" element={<Neighborhood360Page />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
