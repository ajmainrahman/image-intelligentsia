import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity as ActivityIcon, Briefcase, Target, BookOpen, BellRing, NotebookPen, Map as MapIcon } from "lucide-react";

type ActivityItem = {
  id: number;
  type: "job" | "goal" | "progress" | "reminder" | "note" | "roadmap";
  title: string;
  action: string;
  createdAt: string;
};

const META: Record<ActivityItem["type"], { label: string; color: string; Icon: React.ElementType }> = {
  job:      { label: "Job Added",       color: "bg-blue-500",   Icon: Briefcase },
  goal:     { label: "Goal Created",    color: "bg-violet-500", Icon: Target },
  progress: { label: "Progress Logged", color: "bg-emerald-500",Icon: BookOpen },
  reminder: { label: "Reminder Set",    color: "bg-amber-500",  Icon: BellRing },
  note:     { label: "Note Saved",      color: "bg-slate-500",  Icon: NotebookPen },
  roadmap:  { label: "Milestone Added", color: "bg-fuchsia-500",Icon: MapIcon },
};

const FILTERS: { id: "all" | ActivityItem["type"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "job", label: "Jobs" },
  { id: "goal", label: "Goals" },
  { id: "progress", label: "Progress" },
  { id: "reminder", label: "Reminders" },
  { id: "note", label: "Notes" },
  { id: "roadmap", label: "Roadmap" },
];

export default function ActivityPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]["id"]>("all");

  const { data: activity = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["activity", "all"],
    queryFn: () => api<ActivityItem[]>("/activity?limit=100"),
  });

  const filtered = useMemo(
    () => (filter === "all" ? activity : activity.filter((item) => item.type === filter)),
    [activity, filter],
  );

  return (
    <div className="space-y-6 page-enter max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground mt-1">A timeline of everything you’ve added, logged, and saved.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5 text-primary" />
            <CardTitle>All Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/70 text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-4">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filtered.length > 0 ? (
            <ol className="relative border-l-2 border-border pl-6 space-y-5">
              <AnimatePresence initial={false}>
                {filtered.map((item, index) => {
                  const meta = META[item.type] ?? META.note;
                  const Icon = meta.Icon;
                  return (
                    <motion.li
                      key={`${item.type}-${item.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.4) }}
                      className="relative"
                    >
                      <span className={`absolute -left-[34px] top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-white shadow ring-4 ring-background ${meta.color}`}>
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</span>
                        <span className="text-xs text-muted-foreground/80">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })} · {format(new Date(item.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium">{item.title}</p>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <ActivityIcon className="h-10 w-10 mb-3 text-muted/50" />
              <p>No activity to show yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
