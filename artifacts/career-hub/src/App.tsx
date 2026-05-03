import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import { Loader2 } from "lucide-react";

const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const GoalsPage = lazy(() => import("@/pages/goals"));
const GoalDetailPage = lazy(() => import("@/pages/goal-detail"));
const JobsPage = lazy(() => import("@/pages/jobs"));
const NotepadPage = lazy(() => import("@/pages/notepad"));
const ProgressPage = lazy(() => import("@/pages/progress"));
const RoadmapPage = lazy(() => import("@/pages/roadmap"));
const RemindersPage = lazy(() => import("@/pages/reminders"));
const ActivityPage = lazy(() => import("@/pages/activity"));
const WeeklyReviewPage = lazy(() => import("@/pages/weekly-review"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const SignInPage = lazy(() => import("@/pages/signin"));
const ResearchPage = lazy(() => import("@/pages/research"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <SignInPage />
      </Suspense>
    );
  }

  return (
    <PageWrapper>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={() => <PageErrorBoundary message="Could not load your dashboard — please refresh"><Dashboard /></PageErrorBoundary>} />
          <Route path="/goals" component={() => <PageErrorBoundary message="Could not load your goals — please refresh"><GoalsPage /></PageErrorBoundary>} />
          <Route path="/goals/:id" component={() => <PageErrorBoundary message="Could not load your goal — please refresh"><GoalDetailPage /></PageErrorBoundary>} />
          <Route path="/progress" component={() => <PageErrorBoundary message="Could not load your progress — please refresh"><ProgressPage /></PageErrorBoundary>} />
          <Route path="/roadmap" component={() => <PageErrorBoundary message="Could not load your roadmap — please refresh"><RoadmapPage /></PageErrorBoundary>} />
          <Route path="/jobs" component={() => <PageErrorBoundary message="Could not load your jobs — please refresh"><JobsPage /></PageErrorBoundary>} />
          <Route path="/notepad" component={() => <PageErrorBoundary message="Could not load your notepad — please refresh"><NotepadPage /></PageErrorBoundary>} />
          <Route path="/reminders" component={() => <PageErrorBoundary message="Could not load your reminders — please refresh"><RemindersPage /></PageErrorBoundary>} />
          <Route path="/research" component={() => <PageErrorBoundary message="Could not load your research — please refresh"><ResearchPage /></PageErrorBoundary>} />
          <Route path="/activity" component={() => <PageErrorBoundary message="Could not load your activity — please refresh"><ActivityPage /></PageErrorBoundary>} />
          <Route path="/weekly-review" component={() => <PageErrorBoundary message="Could not load your weekly review — please refresh"><WeeklyReviewPage /></PageErrorBoundary>} />
          <Route path="/onboarding" component={() => <PageErrorBoundary message="Could not load onboarding — please refresh"><OnboardingPage /></PageErrorBoundary>} />
          <Route component={() => <PageErrorBoundary message="Could not load this page — please refresh"><NotFound /></PageErrorBoundary>} />
        </Switch>
      </Suspense>
    </PageWrapper>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRoutes />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
