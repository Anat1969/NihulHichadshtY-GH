import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/ProjectContext";
import CommandPalette from "@/components/CommandPalette";
import SmartAssistant from "@/components/SmartAssistant";
import Index from "./pages/Index";
import ProjectPage from "./pages/ProjectPage";
import ProjectsPage from "./pages/ProjectsPage";
import TasksPage from "./pages/TasksPage";
import MeetingsPage from "./pages/MeetingsPage";
import MeetingPage from "./pages/MeetingPage";
import Neighborhood360Page from "./pages/Neighborhood360Page";
import RemindersPage from "./pages/RemindersPage";
import ReportsPage from "./pages/ReportsPage";
import AuditLogPage from "./pages/AuditLogPage";
import UsersPage from "./pages/UsersPage";
import PlanGuidePage from "./pages/PlanGuidePage";
import TamaPage from "./pages/TamaPage";
import TamaSitePage from "./pages/TamaSitePage";
import BuildingPlanPage from "./pages/BuildingPlanPage";
import GanttAllProjectsPage from "./pages/GanttAllProjectsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CommandPalette />
          <SmartAssistant />
          <Routes>
            <Route path="/" element={<Index />} />
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
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
