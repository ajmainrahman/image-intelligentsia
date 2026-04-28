import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Target, BookOpen, Briefcase, BellRing, Trophy, TrendingUp, NotebookPen, Map as MapIcon, CalendarDays } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type Summary = {
  totalGoals: number;
  activeGoals: number;
  progressCompleted: number;
  progressInProgress: number;
  totalJobs: number;
  appliedJobs: number;
  pendingReminders: number;
  roadmapCompleted: number;
  roadmapTotal: number;
};

type Skill = { skill: string; count: number };

type ActivityItem = {
  id: number;
  type: "job" | "goal" | "progress" | "reminder" | "note" | "roadmap";
  title: string;
  action: string;
  createdAt: string;
};

type Reminder = {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  completed: boolean;
  category: string;
  createdAt: string;
};

const ACTIVITY_META: Record<ActivityItem["type"], { label: string; color: string; ring: string; Icon: React.ElementType }> = {
  job:      { label: "Job Added",       color: "bg-blue-500",   ring: "ring-blue-200/60",   Icon: Briefcase },
  goal:     { label: "Goal Created",    color: "bg-violet-500", ring: "ring-violet-200/60", Icon: Target },
  progress: { label: "Progress Logged", color: "bg-emerald-500",ring: "ring-emerald-200/60",Icon: BookOpen },
  reminder: { label: "Reminder Set",    color: "bg-amber-500",  ring: "ring-amber-200/60",  Icon: BellRing },
  note:     { label: "Note Saved",      color: "bg-slate-500",  ring: "ring-slate-200/60",  Icon: NotebookPen },
  roadmap:  { label: "Milestone Added", color: "bg-fuchsia-500",ring: "ring-fuchsia-200/60",Icon: MapIcon },
};

const FILTERS: { id: "all" | ActivityItem["type"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "job", label: "Jobs" },
  { id: "goal", label: "Goals" },
  { id: "progress", label: "Progress" },
  { id: "reminder", label: "Reminders" },
  { id: "note", label: "Notes" },
];

export default function Dashboard() {
  const [filter, setFilter] = useState<typeof FILTERS[number]["id"]>("all");

  const { data: summary, isLoading: isLoadingSummary } = useQuery<Summary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => api<Summary>("/dashboard/summary"),
  });

  const { data: skills, isLoading: isLoadingSkills } = useQuery<Skill[]>({
    queryKey: ["dashboard-skills"],
    queryFn: () => api<Skill[]>("/dashboard/top-skills"),
  });

  const { data: activity, isLoading: isLoadingActivity } = useQuery<ActivityItem[]>({
    queryKey: ["activity"],
    queryFn: () => api<ActivityItem[]>("/activity?limit=20"),
  });

  const { data: reminders, isLoading: isLoadingReminders } = useQuery<Reminder[]>({
    queryKey: ["dashboard-reminders"],
    queryFn: () => api<Reminder[]>("/reminders"),
  });

  const recentReminder = reminders
    ?.filter((reminder) => !reminder.completed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const filteredActivity = useMemo(() => {
    const list = activity ?? [];
    return filter === "all" ? list : list.filter((item) => item.type === filter);
  }, [activity, filter]);

  return (
    <div className="space-y-8 page-enter">
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
          {[
            { label: "Active Goals",       value: summary.activeGoals, hint: `of ${summary.totalGoals} total goals`, Icon: Target },
            { label: "Learning Progress",  value: summary.progressCompleted, hint: `${summary.progressInProgress} currently in progress`, Icon: BookOpen },
            { label: "Jobs Applied",       value: summary.appliedJobs, hint: `of ${summary.totalJobs} saved jobs`, Icon: Briefcase },
            { label: "Pending Reminders",  value: summary.pendingReminders, hint: "Tasks requiring attention", Icon: BellRing },
          ].map((stat) => (
            <Card key={stat.label} className="hover-elevate transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Last 20 events across the app.</p>
              </div>
              <Link href="/activity" className="text-sm font-medium text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      filter === f.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/70 text-muted-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {isLoadingActivity ? (
                <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filteredActivity.length > 0 ? (
                <ol className="relative border-l-2 border-border pl-6 space-y-5">
                  <AnimatePresence initial={false}>
                    {filteredActivity.map((item, index) => {
                      const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.note;
                      const Icon = meta.Icon;
                      return (
                        <motion.li
                          key={`${item.type}-${item.id}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.4) }}
                          className="relative"
                        >
                          <span className={`absolute -left-[34px] top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-white shadow ring-4 ring-background ${meta.color}`}>
                            <Icon className="h-3 w-3" />
                          </span>
                          <div className="flex flex-wrap items-baseline gap-x-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</span>
                            <span className="text-xs text-muted-foreground/80">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                          </div>
                          <p className="mt-0.5 text-sm font-medium line-clamp-1">{item.title}</p>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ol>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <p>No activity in this filter yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                <CardTitle>Recent Reminder Task</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingReminders ? (
                <Skeleton className="h-24 w-full rounded-xl" />
              ) : recentReminder ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold">{recentReminder.title}</p>
                    {recentReminder.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{recentReminder.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize rounded-full bg-muted px-2 py-1">{recentReminder.category}</span>
                    <span className="capitalize rounded-full bg-primary/10 px-2 py-1 text-primary">{recentReminder.priority} priority</span>
                    {recentReminder.dueDate && (
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(recentReminder.dueDate), "MMM d")}
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href="/reminders">Open reminders</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending reminder tasks yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Top Skills in Demand</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSkills ? (
                <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : skills && skills.length > 0 ? (
                <div className="space-y-3">
                  {skills.slice(0, 6).map((skill, index) => (
                    <div key={skill.skill} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium w-4 text-center text-muted-foreground">{index + 1}</span>
                        <span className="font-medium text-sm capitalize">{skill.skill}</span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {skill.count} job{skill.count !== 1 ? "s" : ""}
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
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Roadmap Progress</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You have completed {summary.roadmapCompleted} of {summary.roadmapTotal} roadmap milestones.
                    </p>
                    <div className="mt-4 h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
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
