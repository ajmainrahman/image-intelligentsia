import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Clock, Briefcase, CircleCheckBig, Clock3, XCircle, Sparkles, CheckCircle2,
  Route, BookOpen, Bell, Flame, Target, TrendingUp, GraduationCap, CalendarClock,
  ChevronRight, BarChart3, Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";

type Summary = { totalGoals: number; activeGoals: number; progressCompleted: number; progressInProgress: number; totalJobs: number; appliedJobs: number; pendingReminders: number; roadmapCompleted: number; roadmapTotal: number; pinnedJobs?: number; };
type Goal = { id: number; title: string; progress: number; status: string; skills: string[]; targetRole?: string; targetYear?: number; targetDate?: string | null; };
type ResearchItem = { id: number; title: string; type: string; status: string; tags: string[]; authors: string | null; source: string | null; };
type ProgressEntry = { id: number; title: string; category: string; durationHours: number; status: string; createdAt: string; goalId: number | null; };
type Job = { id: number; title: string; company: string | null; status: string; pinned: boolean; interviewQuestions: string[]; applyDate: string | null; };
type RoadmapItem = { id: number; title: string; description: string | null; yearTarget: number; phase: string; status: string; goalId: number | null; order: number; pinned: boolean; archived: boolean; reflection: string | null; createdAt: string; updatedAt: string; };
type Analytics = { totalJobs: number; pinned: number; interviewCount: number; questionsCount: number; topSkills: { skill: string; count: number }[]; };
type Reminder = { id: number; title: string; dueDate: string | null; priority: string; completed: boolean; category: string; };

function getGreeting(): string { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening"; }

function getNow() { return new Date(); }

function computeStreak(entries: ProgressEntry[]): number {
  const days = new Set<string>();
  for (const e of entries) {
    const d = new Date(e.createdAt); d.setHours(0, 0, 0, 0);
    days.add(d.toISOString());
  }
  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const day = new Date(today); day.setDate(today.getDate() - i);
    if (days.has(day.toISOString())) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

function DueWarningBanner() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["due-warnings"], queryFn: () => api<any>("/due-warnings"), refetchInterval: 5 * 60 * 1000, enabled: !!user });
  if (!data) return null;
  const { overdueReminders = [], soonReminders = [], overdueGoals = [], soonGoals = [] } = data;
  const overdueItems = [
    ...overdueReminders.map((r: any) => ({ title: r.title, type: "reminder" as const })),
    ...overdueGoals.map((g: any) => ({ title: g.title, type: "goal" as const })),
  ];
  const soonItems = [
    ...soonReminders.map((r: any) => ({ title: r.title, type: "reminder" as const, due: r.dueDate })),
    ...soonGoals.map((g: any) => ({ title: g.title, type: "goal" as const, due: g.targetDate })),
  ].sort((a, b) => (a.due ? new Date(a.due).getTime() : Infinity) - (b.due ? new Date(b.due).getTime() : Infinity));
  if (!overdueItems.length && !soonItems.length) return null;
  return (
    <div className="space-y-2">
      {overdueItems.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-3xl px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-700 mb-1.5">{overdueItems.length} item{overdueItems.length > 1 ? "s" : ""} overdue</p>
            <div className="flex flex-wrap gap-1.5">
              {overdueItems.slice(0, 5).map((item, i) => (
                <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                  {item.type === "reminder" ? "🔔" : "🎯"} {item.title}
                </span>
              ))}
              {overdueItems.length > 5 && <span className="text-[11px] text-red-500 self-center">+{overdueItems.length - 5} more</span>}
            </div>
          </div>
        </div>
      )}
      {soonItems.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-3xl px-5 py-4">
          <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-700 mb-1.5">{soonItems.length} item{soonItems.length > 1 ? "s" : ""} due in the next 7 days</p>
            <div className="flex flex-wrap gap-1.5">
              {soonItems.slice(0, 5).map((item, i) => {
                const daysLeft = item.due ? Math.ceil((new Date(item.due).getTime() - Date.now()) / 86400000) : null;
                return (
                  <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                    {item.type === "reminder" ? "🔔" : "🎯"} {item.title}{daysLeft !== null ? ` · ${daysLeft === 0 ? "today" : `${daysLeft}d`}` : ""}
                  </span>
                );
              })}
              {soonItems.length > 5 && <span className="text-[11px] text-amber-600 self-center">+{soonItems.length - 5} more</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(() => getNow());
  useEffect(() => {
    const id = setInterval(() => setTime(getNow()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{format(time, "h:mm a")}</span>;
}

function StatCard({ label, value, tone, sub, href, icon: Icon }: {
  label: string; value: string | number; tone: string; sub?: string; href: string; icon?: React.ElementType;
}) {
  return (
    <Link href={href}>
      <div className="rounded-[24px] border border-[#e4ddd2] bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all group">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tone} group-hover:scale-105 transition-transform`}>
          {Icon ? <Icon className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        </div>
        <p className="mt-4 text-[12px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
        <div className="mt-1 text-[32px] font-bold text-slate-800 leading-none">{value}</div>
        {sub && <p className="mt-1.5 text-[13px] text-muted-foreground">{sub}</p>}
        <div className="mt-3 flex items-center gap-1 text-[12px] text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          <span>View</span><ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}

function StreakCard({ streak }: { streak: number }) {
  const level = streak === 0 ? "Start your streak!" : streak < 3 ? "Keep going!" : streak < 7 ? "Building momentum 🔥" : streak < 14 ? "On fire! 🔥🔥" : "Unstoppable! 🏆";
  return (
    <div className="rounded-[24px] border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] uppercase tracking-wider text-orange-500 font-semibold">Daily Streak</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-[40px] font-bold text-orange-600 leading-none">{streak}</span>
            <span className="text-[15px] text-orange-500 pb-1">day{streak !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-[13px] text-orange-600 mt-1 font-medium">{level}</p>
        </div>
        <div className="h-16 w-16 rounded-2xl bg-orange-100 flex items-center justify-center">
          <Flame className="h-8 w-8 text-orange-500" />
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i < Math.min(streak, 7) ? "bg-orange-400" : "bg-orange-100"}`} />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading: loadingSummary } = useQuery<Summary>({ queryKey: ["dashboard-summary"], queryFn: () => api<Summary>("/dashboard/summary") });
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });
  const { data: roadmap = [] } = useQuery<RoadmapItem[]>({ queryKey: ["roadmap"], queryFn: () => api<RoadmapItem[]>("/roadmap") });
  const { data: research = [] } = useQuery<ResearchItem[]>({ queryKey: ["research"], queryFn: () => api<ResearchItem[]>("/research") });
  const { data: progressEntries = [], isLoading: loadingProgress } = useQuery<ProgressEntry[]>({ queryKey: ["progress"], queryFn: () => api<ProgressEntry[]>("/progress") });
  const { data: jobs = [], isLoading: loadingJobs } = useQuery<Job[]>({ queryKey: ["jobs"], queryFn: () => api<Job[]>("/jobs") });
  const { data: analytics } = useQuery<Analytics>({ queryKey: ["jobs-analytics"], queryFn: () => api<Analytics>("/jobs/analytics") });
  const { data: reminders = [] } = useQuery<Reminder[]>({ queryKey: ["reminders"], queryFn: () => api<Reminder[]>("/reminders") });

  const activeGoals = goals.filter(g => g.status === "active");
  const completedRoadmap = roadmap.filter((item) => item.status === "completed");
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const dateLabel = format(getNow(), "EEEE, d MMM yyyy");

  const streak = useMemo(() => computeStreak(progressEntries), [progressEntries]);

  const inProgressLearning = useMemo(() =>
    progressEntries.filter((e) => e.status === "in_progress").slice(0, 4),
    [progressEntries]
  );

  const recentLearning = useMemo(() =>
    [...progressEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [progressEntries]
  );

  const goalsWithProgress = useMemo(() => {
    return goals.slice(0, 4).map((goal) => {
      const linked = progressEntries.filter((e) => e.goalId === goal.id);
      const linkedRoadmap = roadmap.filter((r) => r.goalId === goal.id);
      const total = linked.length + linkedRoadmap.length;
      let effectiveProgress = goal.progress;
      if (total > 0) {
        const done = linked.filter((e) => e.status === "completed").length + linkedRoadmap.filter((r) => r.status === "completed").length;
        effectiveProgress = Math.round((done / total) * 100);
      }
      const now = getNow(); now.setHours(0, 0, 0, 0);
      let daysLeft: number | null = null;
      if (goal.targetDate) {
        const d = new Date(goal.targetDate); d.setHours(0, 0, 0, 0);
        daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      } else if (goal.targetYear) {
        const d = new Date(goal.targetYear, 11, 31); d.setHours(0, 0, 0, 0);
        daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      }
      return { ...goal, effectiveProgress, daysLeft };
    });
  }, [goals, progressEntries, roadmap]);

  const upcomingDeadlines = useMemo(() => {
    const now = getNow(); now.setHours(0, 0, 0, 0);
    return jobs
      .filter(j => j.applyDate)
      .map(j => {
        const d = new Date(j.applyDate!); d.setHours(0, 0, 0, 0);
        return { ...j, daysLeft: Math.ceil((d.getTime() - now.getTime()) / 86400000) };
      })
      .filter(j => j.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3);
  }, [jobs]);

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
    roadmap
      .filter(r => r.status !== "completed" && !r.archived)
      .sort((a, b) => a.yearTarget - b.yearTarget || a.order - b.order)
      .slice(0, 3),
    [roadmap]
  );

  const totalHours = useMemo(() =>
    Math.round(progressEntries.reduce((s, e) => s + (e.durationHours || 0), 0) * 10) / 10,
    [progressEntries]
  );

  return (
    <div className="space-y-6 page-enter pb-10">
      {/* Hero greeting */}
      <div className="flex items-center justify-between rounded-[28px] border border-[#e4ddd2] bg-gradient-to-br from-[#fdfcf8] to-emerald-50/40 px-6 py-6 shadow-sm">
        <div>
          <h1 className="text-[26px] md:text-[30px] font-bold text-slate-800 leading-tight">{getGreeting()}, {firstName} 👋</h1>
          <p className="text-[14px] text-slate-500 mt-1">
            {dateLabel} · <LiveClock />
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {activeGoals.length > 0 && (
              <span className="text-[12px] px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">{activeGoals.length} active goal{activeGoals.length !== 1 ? "s" : ""}</span>
            )}
            {streak > 0 && (
              <span className="text-[12px] px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">🔥 {streak} day streak</span>
            )}
            {summary?.pendingReminders ? (
              <span className="text-[12px] px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">⏰ {summary.pendingReminders} due</span>
            ) : null}
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-2 text-right">
          <div className="h-14 w-14 rounded-full bg-emerald-600 text-white font-bold text-[16px] flex items-center justify-center shrink-0 shadow-md">
            {user?.name ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
          </div>
          <div className="text-[12px] text-slate-400">
            <p>{summary?.roadmapCompleted ?? 0}/{summary?.roadmapTotal ?? 0} milestones</p>
            <p>{totalHours} hrs logged</p>
          </div>
        </div>
      </div>

      <DueWarningBanner />

      {/* Top stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingSummary ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 rounded-[24px]" />) : (
          <>
            <StatCard
              label="Total Goals"
              value={summary?.totalGoals ?? 0}
              tone="bg-emerald-100 text-emerald-700"
              sub={`${summary?.activeGoals ?? 0} active`}
              href="/goals"
              icon={Target}
            />
            <StatCard
              label="Learning Done"
              value={summary?.progressCompleted ?? 0}
              tone="bg-sky-100 text-sky-700"
              sub={`${summary?.progressInProgress ?? 0} in progress`}
              href="/progress"
              icon={GraduationCap}
            />
            <StatCard
              label="Research Items"
              value={research.length}
              tone="bg-amber-100 text-amber-700"
              sub={`${research.filter(r => r.status === "reading").length} reading now`}
              href="/research"
              icon={BookOpen}
            />
            <StatCard
              label="Hours Logged"
              value={`${totalHours}`}
              tone="bg-violet-100 text-violet-700"
              sub={`across ${progressEntries.length} entries`}
              href="/progress"
              icon={BarChart3}
            />
          </>
        )}
      </div>

      {/* Streak + Upcoming deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StreakCard streak={streak} />

        {upcomingDeadlines.length > 0 ? (
          <Link href="/jobs">
            <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 px-5 py-5 cursor-pointer hover:border-amber-300 transition-colors h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-amber-600" />
                  <h2 className="text-[15px] font-semibold text-amber-800">Upcoming Job Deadlines</h2>
                </div>
                <span className="text-[12px] text-amber-600">see all →</span>
              </div>
              <div className="space-y-2">
                {upcomingDeadlines.map(j => (
                  <div key={j.id} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-[13px] font-medium ${j.daysLeft <= 7 ? "bg-red-100 text-red-700" : j.daysLeft <= 30 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Briefcase className="h-4 w-4 shrink-0" />
                      <span className="line-clamp-1">{j.title}{j.company ? ` · ${j.company}` : ""}</span>
                    </div>
                    <span className="shrink-0 font-bold">{j.daysLeft === 0 ? "Today!" : `${j.daysLeft}d`}</span>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/jobs">
            <div className="rounded-[24px] border border-[#e4ddd2] bg-white p-5 cursor-pointer hover:border-emerald-200 transition-colors h-full flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-5 w-5 text-slate-400" />
                <h2 className="text-[15px] font-semibold text-slate-800">Job Pipeline</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Applied", count: jobs.filter(j => j.status === "applied").length, color: "text-sky-600 bg-sky-50" },
                  { label: "Interviewing", count: jobs.filter(j => j.status === "interviewing").length, color: "text-amber-600 bg-amber-50" },
                  { label: "Offered", count: jobs.filter(j => j.status === "offered").length, color: "text-emerald-600 bg-emerald-50" },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl ${s.color} p-3 text-center`}>
                    <p className="text-[22px] font-bold">{s.count}</p>
                    <p className="text-[11px] font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Goals progress */}
      <div className="rounded-[30px] border border-[#e4ddd2] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            <h2 className="text-[17px] font-semibold text-slate-800">Goals Progress</h2>
          </div>
          <Link href="/goals">
            <span className="text-[13px] text-emerald-600 font-medium hover:underline">{summary?.totalGoals ?? 0} total →</span>
          </Link>
        </div>
        {goalsWithProgress.length > 0 ? (
          <div className="space-y-5">
            {goalsWithProgress.map((goal) => (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${goal.status === "active" ? "bg-emerald-500" : goal.status === "completed" ? "bg-blue-400" : "bg-slate-300"}`} />
                    <p className="text-[14px] font-semibold text-slate-700 line-clamp-1">{goal.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {goal.daysLeft !== null && (
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${goal.daysLeft < 0 ? "bg-red-100 text-red-600" : goal.daysLeft <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        {goal.daysLeft < 0 ? `${Math.abs(goal.daysLeft)}d overdue` : goal.daysLeft === 0 ? "Due today" : `${goal.daysLeft}d left`}
                      </span>
                    )}
                    <span className="text-[14px] font-bold text-slate-600">{goal.effectiveProgress}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[#f0ebe0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                    style={{ width: `${goal.effectiveProgress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="h-10 w-10 text-slate-200 mx-auto mb-2" />
            <p className="text-[14px] text-muted-foreground">No goals yet. Add your first career goal.</p>
          </div>
        )}
      </div>

      {/* Career plan highlights + Current learning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Career plan highlights */}
        <Link href="/roadmap" className="h-full block">
          <div className="h-full min-h-[240px] rounded-[30px] border border-[#e4ddd2] bg-white p-6 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-violet-500" />
                <h2 className="text-[17px] font-semibold text-slate-800">Career Plan</h2>
              </div>
              <span className="text-[12px] text-slate-400">{completedRoadmap.length}/{roadmap.length} milestones</span>
            </div>
            {roadmap.length > 0 && (
              <div className="mb-4">
                <div className="h-2 rounded-full bg-[#f0ebe0] overflow-hidden">
                  <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${roadmap.length ? Math.round((completedRoadmap.length / roadmap.length) * 100) : 0}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{Math.round((completedRoadmap.length / roadmap.length) * 100)}% complete</p>
              </div>
            )}
            {careerHighlights.length > 0 ? (
              <div className="space-y-2">
                {careerHighlights.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-[18px] border border-[#ebe5d8] bg-[#fdfcf8] px-4 py-3">
                    <div className="h-2 w-2 rounded-full bg-violet-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-slate-800 line-clamp-1">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.phase.replace(/_/g, " ")} · {item.yearTarget}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">No roadmap items yet. Plan your trajectory.</p>
            )}
          </div>
        </Link>

        {/* Current learning */}
        <Link href="/progress" className="h-full block">
          <div className="h-full min-h-[240px] rounded-[30px] border border-[#e4ddd2] bg-white p-6 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-sky-500" />
                <h2 className="text-[17px] font-semibold text-slate-800">Currently Learning</h2>
              </div>
              {inProgressLearning.length > 0 && (
                <span className="text-[12px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-100">{inProgressLearning.length} active</span>
              )}
            </div>
            {loadingProgress ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            ) : inProgressLearning.length > 0 ? (
              <div className="space-y-2">
                {inProgressLearning.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-[18px] border border-[#ebe5d8] bg-[#fdfcf8] px-4 py-3">
                    <div className="h-8 w-8 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-slate-800 line-clamp-1">{entry.title}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{entry.category.replace("_", " ")}{entry.durationHours > 0 ? ` · ${entry.durationHours}h` : ""}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0 font-medium">In Progress</span>
                  </div>
                ))}
              </div>
            ) : recentLearning.length > 0 ? (
              <div className="space-y-2">
                {recentLearning.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-[#f0ebe0] pb-2.5 last:border-0">
                    <span className="text-[13px] font-medium text-slate-700 line-clamp-1">{entry.title}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ml-2 font-medium ${entry.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {entry.status === "completed" ? "Done" : entry.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">No learning entries yet. Log your first course or project.</p>
            )}
          </div>
        </Link>
      </div>

      {/* Reminders + Research */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <Link href="/reminders" className="h-full block">
          <div className="h-full min-h-[220px] rounded-[30px] border border-[#e4ddd2] bg-white p-6 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                <h2 className="text-[17px] font-semibold text-slate-800">Reminders & Tasks</h2>
              </div>
              {upcomingReminders.length > 0 && (
                <span className="text-[12px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-100">{upcomingReminders.length}</span>
              )}
            </div>
            {upcomingReminders.length > 0 ? (
              <div className="space-y-2 flex-1">
                {upcomingReminders.map(r => {
                  const daysLeft = r.dueDate ? Math.ceil((new Date(r.dueDate).getTime() - Date.now()) / 86400000) : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-[18px] border border-[#ebe5d8] bg-[#fdfcf8] px-4 py-3">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${r.priority === "high" ? "bg-red-400" : r.priority === "medium" ? "bg-amber-400" : "bg-slate-300"}`} />
                      <span className="text-[13px] font-semibold text-slate-800 line-clamp-1 flex-1 min-w-0">{r.title}</span>
                      {r.dueDate && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 font-semibold ${isOverdue ? "bg-red-100 text-red-600" : isSoon ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                          {isOverdue ? `${Math.abs(daysLeft!)}d ago` : daysLeft === 0 ? "Today" : `${daysLeft}d`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-[14px] text-slate-600 font-semibold">All caught up!</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">No pending reminders.</p>
              </div>
            )}
          </div>
        </Link>

        <Link href="/research" className="h-full block">
          <div className="h-full min-h-[220px] rounded-[30px] border border-[#e4ddd2] bg-white p-6 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-teal-500" />
                <h2 className="text-[17px] font-semibold text-slate-800">Research Library</h2>
              </div>
              <span className="text-[12px] text-slate-400">{research.length} items</span>
            </div>
            <div className="space-y-2 flex-1">
              {research.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-[18px] border border-[#ebe5d8] bg-[#fdfcf8] px-4 py-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-teal-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800 line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.type} · {item.status.replace(/_/g, " ")}</p>
                  </div>
                </div>
              ))}
              {research.length === 0 && (
                <p className="text-[13px] text-muted-foreground py-4 text-center">No research items yet.</p>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Pipeline tracker */}
      <div className="rounded-[30px] border border-[#e4ddd2] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-500" />
            <div>
              <h2 className="text-[17px] font-semibold text-slate-800">Job Pipeline</h2>
              <p className="text-[12px] text-slate-400">Application stages at a glance</p>
            </div>
          </div>
          <Link href="/jobs" className="text-[13px] text-emerald-600 font-medium hover:underline">see all →</Link>
        </div>
        {loadingJobs ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-28 rounded-[24px]" />)}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Saved", count: jobs.filter((j) => j.status === "saved").length, icon: Briefcase, tone: "text-slate-600 bg-slate-100" },
              { label: "Applied", count: jobs.filter((j) => j.status === "applied").length, icon: Clock3, tone: "text-sky-600 bg-sky-100" },
              { label: "Interviewing", count: jobs.filter((j) => j.status === "interviewing").length, icon: Sparkles, tone: "text-amber-600 bg-amber-100" },
              { label: "Offered", count: jobs.filter((j) => j.status === "offered").length, icon: CircleCheckBig, tone: "text-emerald-600 bg-emerald-100" },
              { label: "Rejected", count: jobs.filter((j) => j.status === "rejected").length, icon: XCircle, tone: "text-rose-600 bg-rose-100" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href="/jobs">
                  <div className="rounded-[24px] border border-[#ebe5d8] bg-[#fdfcf8] p-4 hover:border-emerald-200 transition-colors cursor-pointer">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${item.tone}`}><Icon className="h-4.5 w-4.5" /></div>
                    <p className="mt-3 text-[13px] font-semibold text-slate-700">{item.label}</p>
                    <p className="text-[26px] font-bold text-slate-800 leading-none mt-1">{item.count}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Top required skills */}
      {(analytics?.topSkills?.length ?? 0) > 0 && (
        <div className="rounded-[30px] border border-[#e4ddd2] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="text-[17px] font-semibold text-slate-800">Top Required Skills</h2>
            <span className="text-[12px] text-slate-400 ml-auto">From your saved jobs</span>
          </div>
          <div className="space-y-3">
            {(analytics?.topSkills ?? []).slice(0, 5).map((item, i) => {
              const max = analytics!.topSkills[0].count;
              return (
                <div key={item.skill} className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-slate-700 w-32 truncate">{item.skill}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#f0ebe0] overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.round((item.count / max) * 100)}%` }} />
                  </div>
                  <span className="text-[12px] font-bold text-emerald-700 w-12 text-right">{item.count} job{item.count !== 1 ? "s" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
