import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageWrapper } from "@/components/layout/page-wrapper";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import GoalsPage from "@/pages/goals";
import JobsPage from "@/pages/jobs";
import ProgressPage from "@/pages/progress";
import RoadmapPage from "@/pages/roadmap";
import RemindersPage from "@/pages/reminders";

const queryClient = new QueryClient();

function Router() {
  return (
    <PageWrapper>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/goals" component={GoalsPage} />
        <Route path="/progress" component={ProgressPage} />
        <Route path="/roadmap" component={RoadmapPage} />
        <Route path="/jobs" component={JobsPage} />
        <Route path="/reminders" component={RemindersPage} />
        <Route component={NotFound} />
      </Switch>
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