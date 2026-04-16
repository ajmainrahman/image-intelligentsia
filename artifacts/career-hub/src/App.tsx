import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Loader2 } from "lucide-react";

const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const GoalsPage = lazy(() => import("@/pages/goals"));
const JobsPage = lazy(() => import("@/pages/jobs"));
const ProgressPage = lazy(() => import("@/pages/progress"));
const RoadmapPage = lazy(() => import("@/pages/roadmap"));
const RemindersPage = lazy(() => import("@/pages/reminders"));

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

function Router() {
  return (
    <PageWrapper>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/goals" component={GoalsPage} />
          <Route path="/progress" component={ProgressPage} />
          <Route path="/roadmap" component={RoadmapPage} />
          <Route path="/jobs" component={JobsPage} />
          <Route path="/reminders" component={RemindersPage} />
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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
