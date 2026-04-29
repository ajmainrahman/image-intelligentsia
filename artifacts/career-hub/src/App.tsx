import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
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
          <Route path="/" component={Dashboard} />
          <Route path="/goals" component={GoalsPage} />
          <Route path="/goals/:id" component={GoalDetailPage} />
          <Route path="/progress" component={ProgressPage} />
          <Route path="/roadmap" component={RoadmapPage} />
          <Route path="/jobs" component={JobsPage} />
          <Route path="/notepad" component={NotepadPage} />
          <Route path="/reminders" component={RemindersPage} />
          <Route path="/activity" component={ActivityPage} />
          <Route path="/weekly-review" component={WeeklyReviewPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route component={NotFound} />
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
