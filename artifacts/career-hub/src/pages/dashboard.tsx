import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Briefcase, CircleCheckBig, Clock3, XCircle, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

// ─── Types ───────────────────────────────────────────────────────────────────
type Summary = {
  totalGoals: number; activeGoals: number; progressCompleted: number;
  progressInProgress: number; totalJobs: number; appliedJobs: number;
  pendingReminders: number; roadmapCompleted: number; roadmapTotal: number;
};
type Goal = { id: number; title: string; progress: number; status: string; skills: string[] };
type ResearchItem = {
  id: number; title: string; type: string; status: string;
  tags: string[]; authors: string | null; source: string | null;
};
type ProgressEntry = {
  id: number; title: string; category: string;
  durationHours: number; status: string; createdAt: string;
};
type Job = {
  id: number;
  title: string;
  company: string | null;
  description: string;
  keywords: string[];
  skills: string[];
  notes: string | null;
  status: string;
  url: string | null;
  applyDate: string | null;
};

// ─── Status dot colors for research ──────────────────────────────────────────
const RESEARCH_STATUS_COLOR: Record<string, string> = {
  to_explore: "bg-zinc-400",
  reading:    "bg-sky-500",
  working:    "bg-emerald-500",
  completed:  "bg-amber-500",
};

const GOAL_BAR_COLORS = [
  "bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-orange-500",
  "bg-violet-500",  "bg-rose-500",
];

// ─── Greeting helpers ─────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── DueWarningBanner ────────────────────────────────────────────────────────
function DueWarningBanner() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["due-warnings"],
    queryFn: () => api<any>("/due-warnings"),
    refetchInterval: 5 * 60 * 1000,
    enabled: !!user,
  });
  if (!data) return null;
  const { overdueReminders = [], soonReminders = [], overdueGoals = [], soonGoals = [] } = data;
  const overdueCount = overdueReminders.length + overdueGoals.length;
  const soonCount   = soonReminders.length + soonGoals.length;
  if (overdueCount === 0 && soonCount === 0) return null;
  return (
    <div className="space-y-2">
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">{overdueCount} item{overdueCount > 1 ? "s" : ""} overdue</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {overdueReminders.map((r: any) => (
                <Link href="/reminders" key={r.id}>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-200">⏰ {r.title}</span>
                </Link>
              ))}
              {overdueGoals.map((g: any) => (
                <Link href={`/goals/${g.id}`} key={g.id}>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-200">🎯 {g.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      {soonCount > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-700">{soonCount} item{soonCount > 1 ? "s" : ""} due in the next 7 days</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {soonReminders.map((r: any) => (
                <Link href="/reminders" key={r.id}>
                  <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-200">
                    ⏰ {r.title}{r.dueDate ? ` · ${format(new Date(r.dueDate), "MMM d")}` : ""}
                  </span>
                </Link>
              ))}
              {soonGoals.map((g: any) => (
                <Link href={`/goals/${g.id}`} key={g.id}>
                  <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-200">🎯 {g.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();

  const { data: summary, isLoading: loadingSummary } = useQuery<Summary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => api<Summary>("/dashboard/summary"),
  });
  const { data: goals = [], isLoading: loadingGoals } = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => api<Goal[]>("/goals"),
  });
  const { data: research = [], isLoading: loadingResearch } = useQuery<ResearchItem[]>({
    queryKey: ["research"],
    queryFn: () => api<ResearchItem[]>("/research"),
  });
  const { data: progressEntries = [], isLoading: loadingProgress } = useQuery<ProgressEntry[]>({
    queryKey: ["progress"],
    queryFn: () => api<ProgressEntry[]>("/progress"),
  });
  const { data: jobs = [], isLoading: loadingJobs } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: () => api<Job[]>("/jobs"),
  });

  // Derived stats
  const paperCount   = research.filter(r => r.type === "paper" || r.type === "thesis").length;
  const skillsSet    = useMemo(() => {
    const s = new Set<string>();
    for (const g of goals) for (const sk of g.skills ?? []) s.add(sk.toLowerCase().trim());
    return s;
  }, [goals]);
  const activeGoals  = goals.filter(g => g.status === "active");
  const recentProgress = [...progressEntries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const pipelineOrder = ["saved", "applied", "interviewing", "offered", "rejected"];
  const pipelineCounts = pipelineOrder.map((status) => ({
    status,
    count: jobs.filter((job) => job.status === status).length,
  }));
  const pipelineTotal = jobs.length || 1;

  const today = new Date();
  const dateLabel = format(today, "EEEE, d MMM yyyy");
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const initials  = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="space-y-5 page-enter">

      {/* ── Header greeting ── */}
      <div className="flex items-center justify-between rounded-3xl border border-[#e4ddd2] bg-[#fdfcf8] px-5 py-4 shadow-sm">
        <div>
          <h1 className="text-[24px] md:text-[27px] font-bold text-slate-800 leading-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {dateLabel}
            {activeGoals.length > 0 && ` · ${activeGoals.length} active goal${activeGoals.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[13px] flex items-center justify-center shrink-0">
          {initials}
        </div>
      </div>

      <DueWarningBanner />

      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {loadingSummary ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <div className="rounded-2xl border border-[#e4ddd2] bg-white p-4 shadow-sm border-l-4 border-l-emerald-500">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Research items</p>
              <div className="mt-2 text-[30px] font-bold text-slate-800 leading-none">{research.length}</div>
              <p className="mt-1 text-[12px] text-emerald-600">
                {paperCount > 0 ? `${paperCount} paper${paperCount !== 1 ? "s" : ""}` : "tracked"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#e4ddd2] bg-white p-4 shadow-sm border-l-4 border-l-amber-400">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Active goals</p>
              <div className="mt-2 text-[30px] font-bold text-slate-800 leading-none">{summary?.activeGoals ?? 0}</div>
              <p className="mt-1 text-[12px] text-amber-600">of {summary?.totalGoals ?? 0} total</p>
            </div>
            <div className="rounded-2xl border border-[#e4ddd2] bg-white p-4 shadow-sm border-l-4 border-l-sky-500">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Learning done</p>
              <div className="mt-2 text-[30px] font-bold text-slate-800 leading-none">{summary?.progressCompleted ?? 0}</div>
              <p className="mt-1 text-[12px] text-sky-600">{summary?.progressInProgress ?? 0} in progress</p>
            </div>
            <div className="rounded-2xl border border-[#e4ddd2] bg-white p-4 shadow-sm border-l-4 border-l-orange-400">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Skills tracked</p>
              <div className="mt-2 text-[30px] font-bold text-slate-800 leading-none">{skillsSet.size}</div>
              <p className="mt-1 text-[12px] text-orange-500">from {goals.length} goal{goals.length !== 1 ? "s" : ""}</p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-800">Pipeline tracker</h2>
            <p className="text-[12px] text-slate-400">Connect job search status with your dashboard.</p>
          </div>
          <Link href="/jobs" className="text-[12px] text-slate-400 hover:text-emerald-600 transition-colors">see all</Link>
        </div>
        {loadingJobs ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {pipelineCounts.map((item) => {
              const meta = {
                saved: { label: "Saved", icon: Briefcase, tone: "text-slate-600 bg-slate-100" },
                applied: { label: "Applied", icon: Clock3, tone: "text-sky-600 bg-sky-100" },
                interviewing: { label: "Interviewing", icon: Sparkles, tone: "text-amber-600 bg-amber-100" },
                offered: { label: "Offered", icon: CircleCheckBig, tone: "text-emerald-600 bg-emerald-100" },
                rejected: { label: "Rejected", icon: XCircle, tone: "text-rose-600 bg-rose-100" },
              }[item.status];
              const Icon = meta.icon;
              const percent = Math.round((item.count / pipelineTotal) * 100);
              return (
                <Link key={item.status} href="/jobs">
                  <div className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-4 hover:border-emerald-200 transition-colors cursor-pointer">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${meta.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-[13px] font-medium text-slate-700">{meta.label}</p>
                    <p className="text-[24px] font-bold text-slate-800 leading-none mt-1">{item.count}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-[#f0ebe0] overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Goals progress + Research items ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Goals progress */}
        <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-slate-800">Goals progress</h2>
            <span className="text-[12px] text-slate-400">{activeGoals.length} active</span>
          </div>
          {loadingGoals ? (
            <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : activeGoals.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[13px] text-slate-400 mb-2">No active goals yet.</p>
              <Link href="/goals" className="text-[13px] text-emerald-600 hover:underline">Add your first goal →</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activeGoals.slice(0, 5).map((goal, i) => (
                <Link key={goal.id} href={`/goals/${goal.id}`}>
                  <div className="group cursor-pointer">
                    <div className="flex items-center justify-between text-[13px] text-slate-600 mb-1.5">
                      <span className="group-hover:text-emerald-600 transition-colors line-clamp-1">{goal.title}</span>
                      <span className="shrink-0 ml-2 text-slate-400">{goal.progress ?? 0}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#f0ebe0] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${GOAL_BAR_COLORS[i % GOAL_BAR_COLORS.length]}`}
                        style={{ width: `${goal.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
              {activeGoals.length > 5 && (
                <Link href="/goals" className="text-[12px] text-emerald-600 hover:underline">
                  +{activeGoals.length - 5} more goals →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Research items */}
        <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-slate-800">Research items</h2>
            <Link href="/research" className="text-[12px] text-slate-400 hover:text-emerald-600 transition-colors">see all</Link>
          </div>
          {loadingResearch ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : research.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[13px] text-slate-400 mb-2">No research items yet.</p>
              <Link href="/research" className="text-[13px] text-emerald-600 hover:underline">Add your first item →</Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {research.slice(0, 5).map((item) => (
                <Link key={item.id} href="/research">
                  <div className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-3 hover:border-emerald-200 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${RESEARCH_STATUS_COLOR[item.status] ?? "bg-zinc-300"}`} />
                      <div className="min-w-0">
                        <p className="text-[13px] text-slate-700 line-clamp-2 leading-snug">{item.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                          {item.type.replace("_", " ")}
                          {item.tags.length > 0 && ` · ${item.tags[0]}`}
                          {item.status === "working" && " · Active"}
                          {item.status === "completed" && " · Done"}
                          {item.status === "reading" && " · Reading"}
                          {item.status === "to_explore" && " · To explore"}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Learning streak + Quick nav ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Learning streak */}
        <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-slate-800">Recent learning</h2>
            <Link href="/progress" className="text-[12px] text-slate-400 hover:text-emerald-600 transition-colors">see all</Link>
          </div>
          {/* Day dots — last 7 days that have entries */}
          {!loadingProgress && progressEntries.length > 0 && (() => {
            const days = ["M","T","W","T","F","S","S"];
            const today = new Date();
            const active = new Set<number>();
            for (const e of progressEntries) {
              const d = new Date(e.createdAt);
              const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
              if (diff >= 0 && diff < 7) active.add((today.getDay() + 6 - diff) % 7);
            }
            return (
              <div className="flex gap-2 mb-5">
                {days.map((d, i) => (
                  <span key={i} className={`h-8 w-8 rounded-md flex items-center justify-center text-[12px] font-semibold ${active.has(i) ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-500"}`}>{d}</span>
                ))}
              </div>
            );
          })()}
          {loadingProgress ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : recentProgress.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[13px] text-slate-400 mb-2">No learning entries yet.</p>
              <Link href="/progress" className="text-[13px] text-emerald-600 hover:underline">Log your first session →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProgress.map((entry) => (
                <Link key={entry.id} href="/progress">
                  <div className="flex items-center justify-between border-b border-[#f0ebe0] pb-2.5 last:border-0 cursor-pointer group">
                    <span className="text-[13px] text-slate-600 group-hover:text-emerald-600 transition-colors line-clamp-1">{entry.title}</span>
                    <span className="text-[12px] text-emerald-600 shrink-0 ml-2">
                      {entry.durationHours > 0 ? `${entry.durationHours} hr` : entry.status.replace("_", " ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick nav */}
        <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-slate-800">Quick access</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/goals",    label: "Goals",     hint: `${summary?.activeGoals ?? 0} active`,     color: "border-l-emerald-400" },
              { href: "/progress", label: "Learning",  hint: `${summary?.progressCompleted ?? 0} done`,   color: "border-l-sky-400" },
              { href: "/jobs",     label: "Pipeline",  hint: `${summary?.totalJobs ?? 0} tracked`,       color: "border-l-violet-400" },
              { href: "/roadmap",  label: "Roadmap",   hint: `${summary?.roadmapCompleted ?? 0}/${summary?.roadmapTotal ?? 0} done`, color: "border-l-amber-400" },
              { href: "/research", label: "Research",  hint: `${research.length} items`,                 color: "border-l-rose-400" },
              { href: "/reminders",label: "Reminders", hint: `${summary?.pendingReminders ?? 0} pending`, color: "border-l-orange-400" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={`rounded-2xl bg-[#fdfcf8] border border-[#ebe5d8] border-l-4 ${item.color} p-3.5 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors cursor-pointer`}>
                  <p className="text-[14px] font-medium text-slate-700">{item.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.hint}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
