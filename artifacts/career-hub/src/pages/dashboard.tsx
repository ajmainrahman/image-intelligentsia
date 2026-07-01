import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Clock, Briefcase, CheckCircle2, Route, BookOpen, Bell,
  Flame, Target, TrendingUp, GraduationCap, CalendarDays, ChevronRight,
  Zap, Plus, Award,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

type Summary = { totalGoals: number; activeGoals: number; progressCompleted: number; progressInProgress: number; totalJobs: number; appliedJobs: number; pendingReminders: number; roadmapCompleted: number; roadmapTotal: number; };
type Goal = { id: number; title: string; progress: number; status: string; targetYear?: number; targetDate?: string | null; };
type ResearchItem = { id: number; title: string; type: string; status: string; };
type ProgressEntry = { id: number; title: string; category: string; durationHours: number; status: string; createdAt: string; goalId: number | null; };
type Job = { id: number; title: string; company: string | null; status: string; applyDate: string | null; };
type RoadmapItem = { id: number; title: string; yearTarget: number; phase: string; status: string; goalId: number | null; order: number; archived: boolean; };
type Analytics = { topSkills: { skill: string; count: number }[]; };
type Reminder = { id: number; title: string; dueDate: string | null; priority: string; completed: boolean; };

// ─── Date helpers (timezone-safe) ────────────────────────────────────────────
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDate(str: string): Date {
  if (str.includes("T") || str.includes(" ")) return new Date(str);
  return new Date(str + "T00:00:00");
}
function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function computeStreak(entries: ProgressEntry[]): number {
  const days = new Set<string>();
  for (const e of entries) days.add(localDateKey(new Date(e.createdAt)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    if (days.has(localDateKey(day))) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

// ─── Live Clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{format(time, "h:mm a")}</span>;
}

// ─── Due Warning Banner ───────────────────────────────────────────────────────
function DueWarningBanner() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["due-warnings"], queryFn: () => api<any>("/due-warnings"), refetchInterval: 5 * 60 * 1000, enabled: !!user });
  if (!data) return null;
  const { overdueReminders = [], soonReminders = [], overdueGoals = [], soonGoals = [] } = data;
  const overdueItems = [
    ...overdueReminders.map((r: any) => ({ title: r.title, type: "reminder" })),
    ...overdueGoals.map((g: any) => ({ title: g.title, type: "goal" })),
  ];
  const soonItems = [
    ...soonReminders.map((r: any) => ({ title: r.title, type: "reminder", due: r.dueDate })),
    ...soonGoals.map((g: any) => ({ title: g.title, type: "goal", due: g.targetDate })),
  ].sort((a, b) => (a.due ? new Date(a.due).getTime() : Infinity) - (b.due ? new Date(b.due).getTime() : Infinity));
  if (!overdueItems.length && !soonItems.length) return null;
  return (
    <div className="space-y-2">
      {overdueItems.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-red-700 mb-1">{overdueItems.length} item{overdueItems.length > 1 ? "s" : ""} overdue</p>
            <div className="flex flex-wrap gap-1.5">
              {overdueItems.slice(0, 5).map((item, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                  {item.type === "reminder" ? "🔔" : "🎯"} {item.title}
                </span>
              ))}
              {overdueItems.length > 5 && <span className="text-[10px] text-red-500 self-center">+{overdueItems.length - 5} more</span>}
            </div>
          </div>
        </div>
      )}
      {soonItems.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-amber-700 mb-1">{soonItems.length} due in 7 days</p>
            <div className="flex flex-wrap gap-1.5">
              {soonItems.slice(0, 5).map((item, i) => {
                const daysLeft = item.due ? Math.ceil((parseDate(item.due).getTime() - Date.now()) / 86400000) : null;
                return (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                    {item.type === "reminder" ? "🔔" : "🎯"} {item.title}{daysLeft !== null ? ` · ${daysLeft === 0 ? "today" : `${daysLeft}d`}` : ""}
                  </span>
                );
              })}
              {soonItems.length > 5 && <span className="text-[10px] text-amber-600 self-center">+{soonItems.length - 5} more</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────
function ActivityHeatmap({ entries }: { entries: ProgressEntry[] }) {
  const WEEKS = 13;
  const today = new Date();

  const countByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const key = localDateKey(new Date(e.createdAt));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const cells = useMemo(() => {
    const result: { date: Date; count: number; key: string }[] = [];
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (WEEKS * 7 - 1));
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = localDateKey(d);
      result.push({ date: d, count: countByDay.get(key) ?? 0, key });
    }
    return result;
  }, [countByDay]);

  const totalActive = cells.filter(c => c.count > 0).length;
  const totalEntries = entries.length;

  const cellColor = (count: number) => {
    if (count === 0) return "bg-[#eee8de]";
    if (count === 1) return "bg-emerald-200";
    if (count === 2) return "bg-emerald-400";
    return "bg-emerald-600";
  };

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    for (let wi = 0; wi < WEEKS; wi++) {
      const cell = cells[wi * 7];
      if (!cell) continue;
      const m = cell.date.getMonth();
      if (m !== lastMonth) {
        labels.push({ label: format(cell.date, "MMM"), col: wi });
        lastMonth = m;
      }
    }
    return labels;
  }, [cells]);

  return (
    <div className="rounded-2xl border border-[#e4ddd2] bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          <h2 className="text-[14px] font-semibold text-slate-800">Learning Activity</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">{totalActive} days · {totalEntries} entries</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">less</span>
            {["bg-[#eee8de]", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"].map((c, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
            ))}
            <span className="text-[10px] text-slate-400">more</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: `${WEEKS * 14 + (WEEKS - 1) * 2}px` }}>
          {/* Month labels */}
          <div className="relative h-4 mb-1">
            {monthLabels.map(({ label, col }) => (
              <span key={label + col} className="absolute text-[10px] text-slate-400" style={{ left: `${col * 16}px` }}>{label}</span>
            ))}
          </div>
          {/* Grid */}
          <div className="flex gap-0.5">
            {Array.from({ length: WEEKS }).map((_, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {Array.from({ length: 7 }).map((_, di) => {
                  const cell = cells[wi * 7 + di];
                  if (!cell) return <div key={di} className="w-3 h-3" />;
                  return (
                    <div
                      key={di}
                      title={`${format(cell.date, "MMM d, yyyy")} · ${cell.count} entr${cell.count !== 1 ? "ies" : "y"}`}
                      className={`w-3 h-3 rounded-sm ${cellColor(cell.count)} hover:ring-1 hover:ring-emerald-400 transition-all cursor-default`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {/* Day labels */}
          <div className="absolute left-0 top-4 flex flex-col gap-0.5 -translate-x-5">
            {["M", "", "W", "", "F", "", "S"].map((d, i) => (
              <div key={i} className="h-3 flex items-center">
                <span className="text-[9px] text-slate-400">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Add FAB ────────────────────────────────────────────────────────────
type QuickAddType = "learning" | "reminder" | "job" | null;

function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QuickAddType>(null);
  const queryClient = useQueryClient();

  const [lTitle, setLTitle] = useState("");
  const [lCategory, setLCategory] = useState("course");
  const [lHours, setLHours] = useState("1");
  const [lStatus, setLStatus] = useState("in_progress");

  const [rTitle, setRTitle] = useState("");
  const [rDue, setRDue] = useState("");
  const [rPriority, setRPriority] = useState("medium");

  const [jTitle, setJTitle] = useState("");
  const [jCompany, setJCompany] = useState("");

  function reset() {
    setOpen(false); setType(null);
    setLTitle(""); setLCategory("course"); setLHours("1"); setLStatus("in_progress");
    setRTitle(""); setRDue(""); setRPriority("medium");
    setJTitle(""); setJCompany("");
  }

  const addLearning = useMutation({
    mutationFn: () => api<any>("/progress", { method: "POST", body: JSON.stringify({ title: lTitle.trim(), category: lCategory, durationHours: parseFloat(lHours) || 0, status: lStatus }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["progress"] }); queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }); reset(); },
  });
  const addReminder = useMutation({
    mutationFn: () => api<any>("/reminders", { method: "POST", body: JSON.stringify({ title: rTitle.trim(), dueDate: rDue || null, priority: rPriority, category: "general" }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reminders"] }); queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }); reset(); },
  });
  const addJob = useMutation({
    mutationFn: () => api<any>("/jobs", { method: "POST", body: JSON.stringify({ title: jTitle.trim(), company: jCompany.trim() || null, description: "", status: "saved" }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }); reset(); },
  });

  const isPending = addLearning.isPending || addReminder.isPending || addJob.isPending;

  const canSubmit = (type === "learning" && lTitle.trim()) || (type === "reminder" && rTitle.trim()) || (type === "job" && jTitle.trim());

  function handleSubmit() {
    if (type === "learning" && lTitle.trim()) addLearning.mutate();
    if (type === "reminder" && rTitle.trim()) addReminder.mutate();
    if (type === "job" && jTitle.trim()) addJob.mutate();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && canSubmit && !isPending) handleSubmit();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Quick add"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={v => { if (!v) reset(); else setOpen(true); }}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">
              {!type ? "Quick Add" : type === "learning" ? "Log Learning" : type === "reminder" ? "Add Reminder" : "Save Job"}
            </DialogTitle>
          </DialogHeader>

          {!type && (
            <div className="grid grid-cols-3 gap-2 py-1">
              {([
                { t: "learning" as const, icon: GraduationCap, label: "Learning", cls: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100" },
                { t: "reminder" as const, icon: Bell, label: "Reminder", cls: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
                { t: "job" as const, icon: Briefcase, label: "Job", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
              ] as const).map(({ t, icon: Icon, label, cls }) => (
                <button key={t} onClick={() => setType(t)} className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${cls}`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-[12px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          )}

          {type === "learning" && (
            <div className="space-y-2.5 py-1" onKeyDown={handleKey}>
              <Input placeholder="What did you learn?" value={lTitle} onChange={e => setLTitle(e.target.value)} className="text-[13px]" autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <Select value={lCategory} onValueChange={setLCategory}>
                  <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["course", "project", "book", "certification", "workshop", "other"].map(c => (
                      <SelectItem key={c} value={c} className="text-[12px] capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={lStatus} onValueChange={setLStatus}>
                  <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress" className="text-[12px]">In Progress</SelectItem>
                    <SelectItem value="completed" className="text-[12px]">Completed</SelectItem>
                    <SelectItem value="planned" className="text-[12px]">Planned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="number" placeholder="Hours (e.g. 2.5)" value={lHours} onChange={e => setLHours(e.target.value)} className="text-[13px] h-9" min="0" step="0.5" />
            </div>
          )}

          {type === "reminder" && (
            <div className="space-y-2.5 py-1" onKeyDown={handleKey}>
              <Input placeholder="Task or reminder title" value={rTitle} onChange={e => setRTitle(e.target.value)} className="text-[13px]" autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={rDue} onChange={e => setRDue(e.target.value)} className="text-[12px] h-9" />
                <Select value={rPriority} onValueChange={setRPriority}>
                  <SelectTrigger className="text-[12px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="text-[12px]">Low priority</SelectItem>
                    <SelectItem value="medium" className="text-[12px]">Medium priority</SelectItem>
                    <SelectItem value="high" className="text-[12px]">High priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === "job" && (
            <div className="space-y-2.5 py-1" onKeyDown={handleKey}>
              <Input placeholder="Job title" value={jTitle} onChange={e => setJTitle(e.target.value)} className="text-[13px]" autoFocus />
              <Input placeholder="Company (optional)" value={jCompany} onChange={e => setJCompany(e.target.value)} className="text-[13px]" />
            </div>
          )}

          {type && (
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1 text-[12px]" onClick={() => setType(null)}>← Back</Button>
              <Button size="sm" className="flex-1 text-[12px] bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={!canSubmit || isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading: loadingSummary } = useQuery<Summary>({ queryKey: ["dashboard-summary"], queryFn: () => api<Summary>("/dashboard/summary") });
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });
  const { data: roadmap = [] } = useQuery<RoadmapItem[]>({ queryKey: ["roadmap"], queryFn: () => api<RoadmapItem[]>("/roadmap") });
  const { data: research = [] } = useQuery<ResearchItem[]>({ queryKey: ["research"], queryFn: () => api<ResearchItem[]>("/research") });
  const { data: progressEntries = [] } = useQuery<ProgressEntry[]>({ queryKey: ["progress"], queryFn: () => api<ProgressEntry[]>("/progress") });
  const { data: jobs = [] } = useQuery<Job[]>({ queryKey: ["jobs"], queryFn: () => api<Job[]>("/jobs") });
  const { data: analytics } = useQuery<Analytics>({ queryKey: ["jobs-analytics"], queryFn: () => api<Analytics>("/jobs/analytics") });
  const { data: reminders = [] } = useQuery<Reminder[]>({ queryKey: ["reminders"], queryFn: () => api<Reminder[]>("/reminders") });

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const dateLabel = format(new Date(), "EEEE, d MMM yyyy");

  const streak = useMemo(() => computeStreak(progressEntries), [progressEntries]);
  const totalHours = useMemo(() => Math.round(progressEntries.reduce((s, e) => s + (e.durationHours || 0), 0) * 10) / 10, [progressEntries]);
  const activeGoals = goals.filter(g => g.status === "active");
  const completedRoadmap = roadmap.filter(r => r.status === "completed");

  const inProgressLearning = useMemo(() => progressEntries.filter(e => e.status === "in_progress").slice(0, 3), [progressEntries]);
  const recentLearning = useMemo(() => [...progressEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3), [progressEntries]);

  const goalsWithProgress = useMemo(() => goals.slice(0, 5).map(goal => {
    const linked = progressEntries.filter(e => e.goalId === goal.id);
    const linkedRoad = roadmap.filter(r => r.goalId === goal.id);
    const total = linked.length + linkedRoad.length;
    let effectiveProgress = goal.progress;
    if (total > 0) {
      const done = linked.filter(e => e.status === "completed").length + linkedRoad.filter(r => r.status === "completed").length;
      effectiveProgress = Math.round((done / total) * 100);
    }
    const now = new Date(); now.setHours(0, 0, 0, 0);
    let daysLeft: number | null = null;
    if (goal.targetDate) {
      const d = parseDate(goal.targetDate); d.setHours(0, 0, 0, 0);
      daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000);
    } else if (goal.targetYear) {
      const d = new Date(goal.targetYear, 11, 31);
      daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000);
    }
    return { ...goal, effectiveProgress, daysLeft };
  }), [goals, progressEntries, roadmap]);

  const upcomingReminders = useMemo(() =>
    reminders
      .filter(r => !r.completed)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })
      .slice(0, 5),
    [reminders]
  );

  const careerHighlights = useMemo(() =>
    roadmap.filter(r => r.status !== "completed" && !r.archived).sort((a, b) => a.yearTarget - b.yearTarget || a.order - b.order).slice(0, 3),
    [roadmap]
  );

  const jobStages = [
    { key: "saved", label: "Saved", color: "bg-slate-300", dot: "bg-slate-400" },
    { key: "applied", label: "Applied", color: "bg-sky-400", dot: "bg-sky-500" },
    { key: "interviewing", label: "Interview", color: "bg-amber-400", dot: "bg-amber-500" },
    { key: "offered", label: "Waiting", color: "bg-purple-400", dot: "bg-purple-500" },
    { key: "rejected", label: "Rejected", color: "bg-rose-300", dot: "bg-rose-400" },
  ];
  const totalJobs = jobs.length || 1;

  // Learning by category
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of progressEntries) map.set(e.category, (map.get(e.category) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [progressEntries]);

  return (
    <div className="space-y-4 page-enter pb-24">

      {/* ── Hero greeting ── */}
      <div className="rounded-2xl border border-[#e4ddd2] bg-gradient-to-br from-[#fdfcf8] to-emerald-50/50 px-5 py-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-slate-800">{getGreeting()}, {firstName} 👋</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">{dateLabel} · <LiveClock /></p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {activeGoals.length > 0 && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{activeGoals.length} active goal{activeGoals.length !== 1 ? "s" : ""}</span>}
              {streak > 0 && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">🔥 {streak} day streak</span>}
              {(summary?.pendingReminders ?? 0) > 0 && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">⏰ {summary!.pendingReminders} due</span>}
              {totalHours > 0 && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">📚 {totalHours}h logged</span>}
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1 text-right shrink-0 ml-4">
            <div className="h-10 w-10 rounded-full bg-emerald-600 text-white font-bold text-[13px] flex items-center justify-center shadow-md">
              {user?.name ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
            </div>
            <p className="text-[10px] text-slate-400">{completedRoadmap.length}/{roadmap.length} milestones</p>
          </div>
        </div>
      </div>

      <DueWarningBanner />

      {/* ── 4 key stats ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {loadingSummary ? [1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />) : ([
          { label: "Active Goals", value: summary?.activeGoals ?? 0, sub: `${summary?.totalGoals ?? 0} total`, href: "/goals", icon: Target, tone: "bg-emerald-100 text-emerald-600" },
          { label: "Hours Logged", value: `${totalHours}h`, sub: `${progressEntries.length} entries`, href: "/progress", icon: TrendingUp, tone: "bg-sky-100 text-sky-600" },
          { label: "Applications", value: summary?.appliedJobs ?? 0, sub: `${summary?.totalJobs ?? 0} saved`, href: "/jobs", icon: Briefcase, tone: "bg-violet-100 text-violet-600" },
          { label: "Reminders", value: summary?.pendingReminders ?? 0, sub: "pending", href: "/reminders", icon: Bell, tone: "bg-amber-100 text-amber-600" },
        ] as const).map(({ label, value, sub, href, icon: Icon, tone }) => (
          <Link key={label} href={href}>
            <div className="rounded-2xl border border-[#e4ddd2] bg-white px-4 py-3.5 shadow-sm cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all group flex items-center gap-3">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${tone} group-hover:scale-105 transition-transform`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
                <div className="text-[20px] font-bold text-slate-800 leading-tight">{value}</div>
                <p className="text-[10px] text-muted-foreground">{sub}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Activity Heatmap ── */}
      <ActivityHeatmap entries={progressEntries} />

      {/* ── Goals progress | Job Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Goals */}
        <div className="rounded-2xl border border-[#e4ddd2] bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600" />
              <h2 className="text-[14px] font-semibold text-slate-800">Goals Progress</h2>
            </div>
            <Link href="/goals"><span className="text-[11px] text-emerald-600 font-medium hover:underline">{goals.length} total →</span></Link>
          </div>
          {goalsWithProgress.length > 0 ? (
            <div className="space-y-3">
              {goalsWithProgress.map(goal => (
                <div key={goal.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${goal.status === "active" ? "bg-emerald-500" : goal.status === "completed" ? "bg-blue-400" : "bg-slate-300"}`} />
                      <p className="text-[12px] font-semibold text-slate-700 truncate">{goal.title}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {goal.daysLeft !== null && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${goal.daysLeft < 0 ? "bg-red-100 text-red-600" : goal.daysLeft <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                          {goal.daysLeft < 0 ? `${Math.abs(goal.daysLeft)}d late` : goal.daysLeft === 0 ? "today" : `${goal.daysLeft}d`}
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-slate-600 w-8 text-right">{goal.effectiveProgress}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#f0ebe0] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700" style={{ width: `${goal.effectiveProgress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <Target className="h-8 w-8 text-slate-200 mb-2" />
              <p className="text-[12px] text-muted-foreground">No goals yet.</p>
              <Link href="/goals"><span className="text-[11px] text-emerald-600 mt-1 hover:underline">Add your first goal →</span></Link>
            </div>
          )}
        </div>

        {/* Job Pipeline Visual */}
        <Link href="/jobs" className="block">
          <div className="h-full rounded-2xl border border-[#e4ddd2] bg-white px-4 py-4 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-slate-500" />
                <h2 className="text-[14px] font-semibold text-slate-800">Job Pipeline</h2>
              </div>
              <span className="text-[11px] text-slate-400">{jobs.length} total →</span>
            </div>
            {jobs.length > 0 ? (
              <>
                <div className="flex rounded-full overflow-hidden h-3 mb-4 gap-px">
                  {jobStages.map(s => {
                    const count = jobs.filter(j => j.status === s.key).length;
                    if (!count) return null;
                    return <div key={s.key} className={`${s.color} transition-all first:rounded-l-full last:rounded-r-full`} style={{ width: `${(count / totalJobs) * 100}%` }} title={`${s.label}: ${count}`} />;
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {jobStages.map(s => {
                    const count = jobs.filter(j => j.status === s.key).length;
                    return (
                      <div key={s.key} className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                        <span className="text-[11px] text-slate-500 truncate">{s.label}</span>
                        <span className="text-[11px] font-bold text-slate-700 ml-auto">{count}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Applied % indicator */}
                {jobs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#f0ebe0] flex items-center gap-2">
                    <Award className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[11px] text-slate-500">
                      {Math.round((jobs.filter(j => j.status !== "saved").length / jobs.length) * 100)}% of saved jobs actioned
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Briefcase className="h-8 w-8 text-slate-200 mb-2" />
                <p className="text-[12px] text-muted-foreground">No jobs saved yet.</p>
                <span className="text-[11px] text-emerald-600 mt-1">Save your first job →</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* ── Career Plan | Currently Learning ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Link href="/roadmap" className="block h-full">
          <div className="h-full rounded-2xl border border-[#e4ddd2] bg-white px-4 py-4 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-violet-500" />
                <h2 className="text-[14px] font-semibold text-slate-800">Career Plan</h2>
              </div>
              <span className="text-[11px] text-slate-400">{completedRoadmap.length}/{roadmap.length} done</span>
            </div>
            {roadmap.length > 0 && (
              <div className="mb-3">
                <div className="h-1.5 rounded-full bg-[#f0ebe0] overflow-hidden">
                  <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${roadmap.length ? Math.round((completedRoadmap.length / roadmap.length) * 100) : 0}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{roadmap.length ? Math.round((completedRoadmap.length / roadmap.length) * 100) : 0}% complete</p>
              </div>
            )}
            {careerHighlights.length > 0 ? (
              <div className="space-y-1.5">
                {careerHighlights.map(item => (
                  <div key={item.id} className="flex items-center gap-2.5 rounded-xl border border-[#ebe5d8] bg-[#fdfcf8] px-3 py-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-slate-800 truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{item.phase.replace(/_/g, " ")} · {item.yearTarget}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-[12px] text-muted-foreground">No roadmap items yet.</p>}
          </div>
        </Link>

        <Link href="/progress" className="block h-full">
          <div className="h-full rounded-2xl border border-[#e4ddd2] bg-white px-4 py-4 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky-500" />
                <h2 className="text-[14px] font-semibold text-slate-800">Currently Learning</h2>
              </div>
              {inProgressLearning.length > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium border border-sky-100">{inProgressLearning.length} active</span>
              )}
            </div>
            {inProgressLearning.length > 0 ? (
              <div className="space-y-1.5">
                {inProgressLearning.map(entry => (
                  <div key={entry.id} className="flex items-center gap-2.5 rounded-xl border border-[#ebe5d8] bg-[#fdfcf8] px-3 py-2">
                    <div className="h-6 w-6 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                      <Zap className="h-3 w-3 text-sky-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-slate-800 truncate">{entry.title}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{entry.category}{entry.durationHours > 0 ? ` · ${entry.durationHours}h` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentLearning.length > 0 ? (
              <div className="divide-y divide-[#f0ebe0]">
                {recentLearning.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="text-[12px] font-medium text-slate-700 truncate">{entry.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${entry.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {entry.status === "completed" ? "Done" : entry.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-[12px] text-muted-foreground">No learning entries yet.</p>}

            {/* Category breakdown */}
            {categoryStats.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#f0ebe0]">
                <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">By category</p>
                <div className="flex flex-wrap gap-1">
                  {categoryStats.map(([cat, count]) => (
                    <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize">{cat} {count}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* ── Reminders | Research ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Link href="/reminders" className="block h-full">
          <div className="h-full rounded-2xl border border-[#e4ddd2] bg-white px-4 py-4 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                <h2 className="text-[14px] font-semibold text-slate-800">Reminders</h2>
              </div>
              {upcomingReminders.length > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-100">{upcomingReminders.length}</span>}
            </div>
            {upcomingReminders.length > 0 ? (
              <div className="space-y-1.5 flex-1">
                {upcomingReminders.map(r => {
                  const daysLeft = r.dueDate ? Math.ceil((parseDate(r.dueDate).getTime() - Date.now()) / 86400000) : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;
                  return (
                    <div key={r.id} className="flex items-center gap-2.5 rounded-xl border border-[#ebe5d8] bg-[#fdfcf8] px-3 py-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${r.priority === "high" ? "bg-red-400" : r.priority === "medium" ? "bg-amber-400" : "bg-slate-300"}`} />
                      <span className="text-[12px] font-medium text-slate-800 truncate flex-1">{r.title}</span>
                      {r.dueDate && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-semibold ${isOverdue ? "bg-red-100 text-red-600" : isSoon ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                          {isOverdue ? `${Math.abs(daysLeft!)}d ago` : daysLeft === 0 ? "Today" : `${daysLeft}d`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-300 mb-1.5" />
                <p className="text-[12px] font-semibold text-slate-600">All caught up!</p>
                <p className="text-[11px] text-muted-foreground">No pending reminders.</p>
              </div>
            )}
          </div>
        </Link>

        <Link href="/research" className="block h-full">
          <div className="h-full rounded-2xl border border-[#e4ddd2] bg-white px-4 py-4 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-teal-500" />
                <h2 className="text-[14px] font-semibold text-slate-800">Research Library</h2>
              </div>
              <span className="text-[11px] text-slate-400">{research.length} items</span>
            </div>
            {research.length > 0 ? (
              <>
                <div className="space-y-1.5 flex-1">
                  {research.slice(0, 3).map(item => (
                    <div key={item.id} className="flex items-center gap-2.5 rounded-xl border border-[#ebe5d8] bg-[#fdfcf8] px-3 py-2">
                      <div className="h-2 w-2 rounded-full bg-teal-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-slate-800 truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">{item.type} · {item.status.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Status breakdown */}
                <div className="mt-3 pt-3 border-t border-[#f0ebe0] flex gap-3">
                  {[
                    { label: "To explore", status: "to_explore", color: "text-slate-500 bg-slate-100" },
                    { label: "Reading", status: "reading", color: "text-amber-600 bg-amber-50" },
                    { label: "Done", status: "completed", color: "text-emerald-600 bg-emerald-50" },
                  ].map(({ label, status, color }) => {
                    const count = research.filter(r => r.status === status).length;
                    if (!count) return null;
                    return (
                      <span key={status} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>{label} {count}</span>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 py-4 text-center">
                <BookOpen className="h-7 w-7 text-slate-200 mb-1.5" />
                <p className="text-[12px] text-muted-foreground">No research items yet.</p>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* ── Top skills ── */}
      {(analytics?.topSkills?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-[#e4ddd2] bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-[14px] font-semibold text-slate-800">Top Required Skills</h2>
            <span className="text-[11px] text-slate-400 ml-auto">From saved jobs</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {(analytics!.topSkills).slice(0, 8).map((item) => {
              const max = analytics!.topSkills[0].count;
              return (
                <div key={item.skill} className="flex items-center gap-2.5">
                  <span className="text-[12px] font-medium text-slate-700 w-24 truncate shrink-0">{item.skill}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#f0ebe0] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${Math.round((item.count / max) * 100)}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 w-5 text-right shrink-0">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick Add FAB ── */}
      <QuickAddFAB />
    </div>
  );
}
