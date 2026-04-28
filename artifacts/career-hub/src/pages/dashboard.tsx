import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
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

const ACTIVITY_META: Record
  ActivityItem["type"],
  { label: string }
> = {
  job:      { label: "Job added" },
  goal:     { label: "Goal created" },
  progress: { label: "Progress logged" },
  reminder: { label: "Reminder set" },
  note:     { label: "Note saved" },
  roadmap:  { label: "Milestone added" },
};

const FILTERS: { id: "all" | ActivityItem["type"]; label: string }[] = [
  { id: "all",      label: "All" },
  { id: "job",      label: "Jobs" },
  { id: "goal",     label: "Goals" },
  { id: "progress", label: "Progress" },
  { id: "reminder", label: "Reminders" },
  { id: "note",     label: "Notes" },
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
    ?.filter((r) => !r.completed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const filteredActivity = useMemo(() => {
    const list = activity ?? [];
    return filter === "all" ? list : list.filter((item) => item.type === filter);
  }, [activity, filter]);

  const roadmapPct =
    summary && summary.roadmapTotal > 0
      ? Math.round((summary.roadmapCompleted / summary.roadmapTotal) * 100)
      : 0;

  return (
    <div className="space-y-10 page-enter">

      {/* Page header */}
      <div>
        <h1
          className="text-[28px] text-foreground leading-tight"
          style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}
        >
          Your overview
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1.5">
          Here's where things stand today.
        </p>
      </div>

      {/* Stat cards — 2 column */}
      {isLoadingSummary ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Active goals",
              value: summary.activeGoals,
              hint: `of ${summary.totalGoals} total`,
            },
            {
              label: "Learning completed",
              value: summary.progressCompleted,
              hint: `${summary.progressInProgress} in progress`,
            },
            {
              label: "Jobs applied",
              value: summary.appliedJobs,
              hint: `of ${summary.totalJobs} saved`,
            },
            {
              label: "Pending reminders",
              value: summary.pendingReminders,
              hint: "awaiting action",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-secondary rounded-xl px-5 py-4"
            >
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {stat.label}
              </p>
              <p
                className="text-[28px] text-foreground leading-none"
                style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}
              >
                {stat.value}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1.5">
                {stat.hint}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Activity timeline — 2/3 width */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2
                  className="text-[17px] text-foreground"
                  style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}
                >
                  Recent activity
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Last 20 events across the app
                </p>
              </div>
              <Link
                href="/activity"
                className="text-[12px] text-primary hover:underline underline-offset-2"
              >
                View all
              </Link>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                    filter === f.id
                      ? "bg-accent text-primary"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Timeline */}
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredActivity.length > 0 ? (
              <ol className="relative border-l border-border pl-6 space-y-5">
                <AnimatePresence initial={false}>
                  {filteredActivity.map((item, index) => {
                    const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.note;
                    return (
                      <motion.li
                        key={`${item.type}-${item.id}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.25,
                          delay: Math.min(index * 0.04, 0.35),
                          ease: [0.25, 0.1, 0.25, 1],
                        }}
                        className="relative"
                      >
                        {/* Timeline dot */}
                        <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-primary/40 ring-2 ring-background" />
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-[11px] font-medium text-primary uppercase tracking-wide">
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-foreground line-clamp-1">
                          {item.title}
                        </p>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ol>
            ) : (
              <div className="flex items-center justify-center py-12 text-center">
                <p className="text-[13px] text-muted-foreground">
                  No activity in this filter yet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right column — 1/3 width */}
        <div className="space-y-5">

          {/* Reminder card */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2
              className="text-[15px] text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}
            >
              Don't forget
            </h2>
            {isLoadingReminders ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : recentReminder ? (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-foreground">
                  {recentReminder.title}
                </p>
                {recentReminder.description && (
                  <p className="text-[12px] text-muted-foreground line-clamp-2">
                    {recentReminder.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">
                    {recentReminder.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-accent text-primary capitalize">
                    {recentReminder.priority} priority
                  </span>
                  {recentReminder.dueDate && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(recentReminder.dueDate), "MMM d")}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full text-[12px] mt-1"
                >
                  <Link href="/reminders">View reminders</Link>
                </Button>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                No pending reminders right now.
              </p>
            )}
          </div>

          {/* Top skills */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2
              className="text-[15px] text-foreground mb-4"
              style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}
            >
              Skills in demand
            </h2>
            {isLoadingSkills ? (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : skills && skills.length > 0 ? (
              <div className="space-y-2">
                {skills.slice(0, 6).map((skill, index) => (
                  <div
                    key={skill.skill}
                    className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] text-muted-foreground w-4 text-right">
                        {index + 1}
                      </span>
                      <span className="text-[13px] text-foreground capitalize">
                        {skill.skill}
                      </span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-primary font-medium">
                      {skill.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Save jobs to see required skills here.
              </p>
            )}
          </div>

          {/* Roadmap progress */}
          {summary && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2
                className="text-[15px] text-foreground mb-1"
                style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}
              >
                Roadmap progress
              </h2>
              <p className="text-[12px] text-muted-foreground mb-4">
                {summary.roadmapCompleted} of {summary.roadmapTotal} milestones complete
              </p>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${roadmapPct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 text-right">
                {roadmapPct}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
