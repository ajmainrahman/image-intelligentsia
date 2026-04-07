import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetTopSkills, getGetTopSkillsQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, BookOpen, Briefcase, BellRing, Trophy, TrendingUp, Clock, Activity, Map as MapIcon } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: skills, isLoading: isLoadingSkills } = useGetTopSkills({ query: { queryKey: getGetTopSkillsQueryKey() } });
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Your career progress at a glance.</p>
      </div>

      {isLoadingSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Goals</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.activeGoals}</div>
              <p className="text-xs text-muted-foreground mt-1">of {summary.totalGoals} total goals</p>
            </CardContent>
          </Card>
          
          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Learning Progress</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.progressCompleted}</div>
              <p className="text-xs text-muted-foreground mt-1">{summary.progressInProgress} currently in progress</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Jobs Applied</CardTitle>
              <Briefcase className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.appliedJobs}</div>
              <p className="text-xs text-muted-foreground mt-1">of {summary.totalJobs} saved jobs</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reminders</CardTitle>
              <BellRing className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.pendingReminders}</div>
              <p className="text-xs text-muted-foreground mt-1">Tasks requiring attention</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border">
                  {activity.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-background bg-muted text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm">
                        {item.type === "goal" && <Target className="h-3.5 w-3.5" />}
                        {item.type === "progress" && <BookOpen className="h-3.5 w-3.5" />}
                        {item.type === "job" && <Briefcase className="h-3.5 w-3.5" />}
                        {item.type === "roadmap" && <MapIcon className="h-3.5 w-3.5" />}
                        {item.type === "reminder" && <BellRing className="h-3.5 w-3.5" />}
                      </div>
                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border bg-card shadow-sm group-hover:border-primary/20 transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{item.action}</span>
                          <span className="text-sm text-muted-foreground line-clamp-1">{item.title}</span>
                          <span className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(item.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mb-4 text-muted/50" />
                  <p>No recent activity.</p>
                  <p className="text-sm mt-1">Start tracking your goals and progress.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Top Skills in Demand</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSkills ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : skills && skills.length > 0 ? (
                <div className="space-y-3">
                  {skills.map((skill, index) => (
                    <div key={skill.skill} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium w-4 text-center text-muted-foreground">{index + 1}</span>
                        <span className="font-medium text-sm">{skill.skill}</span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {skill.count} job{skill.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Save jobs to see required skills here.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {summary && (
            <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-foreground/90">Roadmap Progress</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You have completed {summary.roadmapCompleted} of {summary.roadmapTotal} roadmap milestones.
                    </p>
                    <div className="mt-4 h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-1000" 
                        style={{ width: `${summary.roadmapTotal > 0 ? (summary.roadmapCompleted / summary.roadmapTotal) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}