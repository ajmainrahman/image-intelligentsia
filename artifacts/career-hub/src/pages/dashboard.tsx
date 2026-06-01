import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Briefcase, CircleCheckBig, Clock3, XCircle, Sparkles, CheckCircle2, UserRound, Route, BookOpen, MessageSquare, CheckCheck, Bell, ChevronRight, X, Save } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";

type Summary = { totalGoals: number; activeGoals: number; progressCompleted: number; progressInProgress: number; totalJobs: number; appliedJobs: number; pendingReminders: number; roadmapCompleted: number; roadmapTotal: number; pinnedJobs?: number; };
type Goal = { id: number; title: string; progress: number; status: string; skills: string[] };
type ResearchItem = { id: number; title: string; type: string; status: string; tags: string[]; authors: string | null; source: string | null; };
type ProgressEntry = { id: number; title: string; category: string; durationHours: number; status: string; createdAt: string; goalId: number | null; };
type Job = { id: number; title: string; company: string | null; status: string; pinned: boolean; interviewQuestions: string[]; applyDate: string | null; };
type RoadmapItem = { id: number; title: string; description: string | null; yearTarget: number; phase: string; status: string; goalId: number | null; order: number; pinned: boolean; archived: boolean; reflection: string | null; createdAt: string; updatedAt: string; };
type Analytics = { totalJobs: number; pinned: number; interviewCount: number; questionsCount: number; topSkills: { skill: string; count: number }[]; };
type InterviewQuestion = { id: number; question: string; answer: string | null; category: string | null; createdAt: string; };
type Reminder = { id: number; title: string; dueDate: string | null; priority: string; completed: boolean; category: string; };
type Profile = { tagline: string; about: string; expertise: string[]; skills: string[]; interests: string[]; };

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  not_started: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  in_progress:  { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  completed:    { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

function getGreeting(): string { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening"; }

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

function StatCard({ label, value, tone, sub, href }: { label: string; value: string | number; tone: string; sub?: string; href: string }) {
  return (
    <Link href={href}>
      <div className="rounded-[24px] border border-[#e4ddd2] bg-white p-4 shadow-sm min-h-[120px] cursor-pointer hover:border-emerald-200 transition-colors">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}><CheckCircle2 className="h-4 w-4" /></div>
        <p className="mt-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
        <div className="mt-1 text-[30px] font-bold text-slate-800 leading-none">{value}</div>
        {sub && <p className="mt-1.5 text-[12px] text-muted-foreground">{sub}</p>}
      </div>
    </Link>
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
  const { data: skillGap } = useQuery<any>({ queryKey: ["skill-gap"], queryFn: () => api<any>("/dashboard/skill-gap") });
  const { data: analytics } = useQuery<Analytics>({ queryKey: ["jobs-analytics"], queryFn: () => api<Analytics>("/jobs/analytics") });
  const { data: interviewQuestions = [] } = useQuery<InterviewQuestion[]>({ queryKey: ["interview-questions"], queryFn: () => api<InterviewQuestion[]>("/interview-questions") });
  const { data: reminders = [] } = useQuery<Reminder[]>({ queryKey: ["reminders"], queryFn: () => api<Reminder[]>("/reminders") });
  const { data: profile } = useQuery<Profile>({ queryKey: ["profile"], queryFn: () => api<Profile>("/profile") });

  const activeGoals = goals.filter(g => g.status === "active");
  const completedRoadmap = roadmap.filter((item) => item.status === "completed");
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const initials = user?.name ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?";
  const dateLabel = format(new Date(), "EEEE, d MMM yyyy");
  const skillsSet = useMemo(() => { const s = new Set<string>(); for (const g of goals) for (const sk of g.skills ?? []) s.add(sk.toLowerCase().trim()); return s; }, [goals]);
  const researchCount = research.length;
  const learningCount = summary?.progressCompleted ?? 0;

  // Recent learning with status
  const recentProgress = useMemo(() =>
    [...progressEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [progressEntries]
  );

  // In-progress learning items (for dashboard highlight)
  const inProgressLearning = useMemo(() =>
    progressEntries.filter((e) => e.status === "in_progress").slice(0, 4),
    [progressEntries]
  );

  // Goals with computed progress from linked learning entries
  const goalsWithProgress = useMemo(() => {
    return goals.slice(0, 3).map((goal) => {
      const linked = progressEntries.filter((e) => e.goalId === goal.id);
      const linkedRoadmap = roadmap.filter((r) => r.goalId === goal.id);
      const total = linked.length + linkedRoadmap.length;
      if (total > 0) {
        const done = linked.filter((e) => e.status === "completed").length + linkedRoadmap.filter((r) => r.status === "completed").length;
        return { ...goal, effectiveProgress: Math.round((done / total) * 100) };
      }
      return { ...goal, effectiveProgress: goal.progress };
    });
  }, [goals, progressEntries, roadmap]);

  // Upcoming job deadlines (top 3 soonest)
  const upcomingDeadlines = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0);
    return jobs
      .filter(j => j.applyDate)
      .map(j => {
        const d = new Date(j.applyDate!); d.setHours(0,0,0,0);
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
      .slice(0, 4),
    [reminders]
  );

  // Interview prep stats
  const answeredCount = interviewQuestions.filter((q) => q.answer).length;
  const unansweredCount = interviewQuestions.length - answeredCount;
  const iqByCategory = useMemo(() => {
    const map = new Map<string, number>();
    interviewQuestions.forEach((q) => { const cat = q.category || "Other"; map.set(cat, (map.get(cat) ?? 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [interviewQuestions]);

  return (
    <div className="space-y-6 page-enter pb-8">
      {/* Hero greeting */}
      <div className="flex items-center justify-between rounded-[28px] border border-[#e4ddd2] bg-[#fdfcf8] px-6 py-5 shadow-sm">
        <div>
          <h1 className="text-[24px] md:text-[27px] font-bold text-slate-800 leading-tight">{getGreeting()}, {firstName}</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{dateLabel}{activeGoals.length > 0 && ` · ${activeGoals.length} active goal${activeGoals.length !== 1 ? "s" : ""}`}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[13px] flex items-center justify-center shrink-0">{initials}</div>
          <div className="text-[12px] text-slate-400"><p>{summary?.pendingReminders ?? 0} due</p><p>{summary?.roadmapCompleted ?? 0}/{summary?.roadmapTotal ?? 0} roadmap</p></div>
        </div>
      </div>

      <DueWarningBanner />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loadingSummary ? [1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-[24px]" />) : (
          <>
            <StatCard label="Research items" value={researchCount} tone="bg-emerald-100 text-emerald-700" sub={researchCount > 0 ? "tracked" : "add your reading"} href="/research" />
            <StatCard label="Active goals" value={summary?.activeGoals ?? 0} tone="bg-amber-100 text-amber-700" sub={`of ${summary?.totalGoals ?? 0} total`} href="/goals" />
            <StatCard label="Learning done" value={learningCount} tone="bg-sky-100 text-sky-700" sub={`${summary?.progressInProgress ?? 0} in progress`} href="/progress" />
            <StatCard label="Skills tracked" value={skillsSet.size} tone="bg-orange-100 text-orange-700" sub={`from ${goals.length} goal${goals.length !== 1 ? "s" : ""}`} href="/goals" />
          </>
        )}
      </div>

      {/* Upcoming job deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Link href="/jobs">
          <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 dark:bg-amber-900/10 dark:border-amber-800/40 px-5 py-4 cursor-pointer hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <h2 className="text-[14px] font-semibold text-amber-800 dark:text-amber-300">Upcoming Deadlines</h2>
              </div>
              <span className="text-[12px] text-amber-600 dark:text-amber-400">see all →</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {upcomingDeadlines.map(j => (
                <div key={j.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium ${j.daysLeft <= 7 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : j.daysLeft <= 30 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-1 max-w-[140px]">{j.title}</span>
                  <span className="shrink-0 font-bold">{j.daysLeft === 0 ? "Today!" : `${j.daysLeft}d`}</span>
                </div>
              ))}
            </div>
          </div>
        </Link>
      )}

      {/* Goals progress + Research */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <Link href="/goals" className="h-full block">
          <div className="h-full min-h-[230px] rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-slate-800">Goals progress</h2>
              <span className="text-[12px] text-slate-400">{summary?.activeGoals ?? 0} active</span>
            </div>
            {goalsWithProgress.length ? (
              <div className="space-y-4">
                {goalsWithProgress.map((goal) => (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-700 line-clamp-1">{goal.title}</p>
                      <span className="text-sm text-slate-400 shrink-0">{goal.effectiveProgress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#f0ebe0] overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${goal.effectiveProgress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No goals yet.</p>}
          </div>
        </Link>

        <Link href="/research" className="h-full block">
          <div className="h-full min-h-[230px] rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-slate-800">Research items</h2>
              <span className="text-[12px] text-slate-400">see all</span>
            </div>
            <div className="space-y-3">
              {research.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-[20px] border border-[#ebe5d8] bg-[#fdfcf8] p-4 flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-800 truncate">{item.title}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{item.status.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.type} · {item.source ?? "No source"}</p>
                  </div>
                </div>
              ))}
              {research.length === 0 && <p className="text-sm text-muted-foreground">No research items yet.</p>}
            </div>
          </div>
        </Link>
      </div>

      {/* Current learning (in-progress) + Skill gap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <Link href="/progress" className="h-full block">
          <div className="h-full min-h-[230px] rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-slate-800">Currently learning</h2>
              <div className="flex items-center gap-2">
                {inProgressLearning.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{inProgressLearning.length} in progress</span>
                )}
                <span className="text-[12px] text-slate-400">see all</span>
              </div>
            </div>
            {loadingProgress ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            ) : inProgressLearning.length > 0 ? (
              <div className="space-y-2">
                {inProgressLearning.map((entry) => {
                  const linkedGoal = goals.find(g => g.id === entry.goalId);
                  return (
                    <div key={entry.id} className="rounded-[18px] border border-[#ebe5d8] bg-[#fdfcf8] px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-medium text-slate-800 line-clamp-1">{entry.title}</p>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0">In Progress</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-muted-foreground capitalize">{entry.category.replace("_", " ")}</span>
                        {entry.durationHours > 0 && <span className="text-[11px] text-muted-foreground">· {entry.durationHours}h</span>}
                        {linkedGoal && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-accent text-primary">↗ {linkedGoal.title}</span>}
                      </div>
                    </div>
                  );
                })}
                {recentProgress.filter(e => e.status !== "in_progress").slice(0, 2).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between border-b border-[#f0ebe0] pb-2.5 last:border-0">
                    <span className="text-[13px] text-slate-600 line-clamp-1">{entry.title}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${entry.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {entry.status === "completed" ? "Done" : "Not started"}
                    </span>
                  </div>
                ))}
              </div>
            ) : recentProgress.length > 0 ? (
              <div className="space-y-2.5">
                {recentProgress.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between border-b border-[#f0ebe0] pb-2.5 last:border-0">
                    <span className="text-[13px] text-slate-600 line-clamp-1">{entry.title}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${entry.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {entry.status === "completed" ? "Done" : entry.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No learning entries yet. Log your first course or project.</p>
            )}
          </div>
        </Link>

        <Link href="/skill-map" className="h-full block">
          <div className="h-full min-h-[230px] rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-slate-800">Skill gap analyzer</h2>
              <span className="text-[12px] text-slate-400">Goals vs learning vs jobs</span>
            </div>
            {!skillGap ? (
              <Skeleton className="h-36 w-full rounded-[24px]" />
            ) : skillGap.goalSkills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-[13px] font-medium text-slate-700">No skills to analyze yet</p>
                <p className="text-[12px] text-muted-foreground mt-1 max-w-[200px]">Add skills to your goals to unlock gap analysis.</p>
                <span className="mt-3 text-[12px] text-primary font-medium">Go to Skill Map →</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[20px] bg-[#fdfcf8] border border-[#ebe5d8] p-4"><p className="text-xs text-slate-400">Coverage</p><p className="text-2xl font-bold text-slate-800">{skillGap.coveragePercent}%</p></div>
                  <div className="rounded-[20px] bg-[#fdfcf8] border border-[#ebe5d8] p-4"><p className="text-xs text-slate-400">Gaps</p><p className="text-2xl font-bold text-slate-800">{skillGap.gaps.length}</p></div>
                  <div className="rounded-[20px] bg-[#fdfcf8] border border-[#ebe5d8] p-4"><p className="text-xs text-slate-400">Covered</p><p className="text-2xl font-bold text-slate-800">{skillGap.covered.length}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">{skillGap.gaps.slice(0, 8).map((gap: string) => <Badge key={gap} variant="outline" className="text-xs">{gap}</Badge>)}</div>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Profile + Reminders + Roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* Profile */}
        <Link href="/profile" className="h-full block">
          <div className="h-full min-h-[220px] rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-slate-800">Profile</h2>
              <UserRound className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[14px] flex items-center justify-center shrink-0">{initials}</div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-800 truncate">{user?.name}</p>
                {profile?.tagline
                  ? <p className="text-[12px] text-muted-foreground truncate">{profile.tagline}</p>
                  : <p className="text-[12px] text-muted-foreground italic">No tagline yet</p>
                }
              </div>
            </div>
            {(profile?.skills?.length ?? 0) > 0 ? (
              <div className="flex-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {profile!.skills.slice(0, 5).map(s => <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-primary">{s}</span>)}
                  {profile!.skills.length > 5 && <span className="text-[11px] text-muted-foreground self-center">+{profile!.skills.length - 5}</span>}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground flex-1">Complete your profile to showcase your skills and expertise.</p>
            )}
            <div className="mt-3 pt-3 border-t border-[#f0ebe0]">
              <span className="text-[12px] text-primary font-medium">Edit profile →</span>
            </div>
          </div>
        </Link>

        {/* Reminders & Tasks */}
        <Link href="/reminders" className="h-full block">
          <div className="h-full min-h-[220px] rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-slate-800">Reminders & Tasks</h2>
                {upcomingReminders.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-100">{upcomingReminders.length}</span>
                )}
              </div>
              <Bell className="h-4 w-4 text-slate-400" />
            </div>
            {upcomingReminders.length > 0 ? (
              <div className="space-y-2 flex-1">
                {upcomingReminders.map(r => {
                  const daysLeft = r.dueDate ? Math.ceil((new Date(r.dueDate).getTime() - Date.now()) / 86400000) : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;
                  return (
                    <div key={r.id} className="flex items-center gap-2.5 rounded-[18px] border border-[#ebe5d8] bg-[#fdfcf8] px-3 py-2.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${r.priority === "high" ? "bg-red-400" : r.priority === "medium" ? "bg-amber-400" : "bg-slate-300"}`} />
                      <span className="text-[13px] font-medium text-slate-800 line-clamp-1 flex-1 min-w-0">{r.title}</span>
                      {r.dueDate && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${isOverdue ? "bg-red-100 text-red-600" : isSoon ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
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
                <p className="text-[13px] text-slate-600 font-medium">All caught up!</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">No pending reminders.</p>
              </div>
            )}
          </div>
        </Link>

        {/* Roadmap */}
        <Link href="/roadmap" className="h-full block">
          <div className="h-full min-h-[220px] rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-slate-800">Roadmap</h2>
              <Route className="h-4 w-4 text-slate-400" />
            </div>
            {roadmap.length ? (
              <div className="space-y-2 flex-1">
                {completedRoadmap.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((completedRoadmap.length / roadmap.length) * 100)}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{completedRoadmap.length}/{roadmap.length} done</span>
                  </div>
                )}
                {roadmap.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-[18px] border border-[#ebe5d8] bg-[#fdfcf8] p-3">
                    <p className="text-[13px] font-medium text-slate-800 line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.phase.replace("_", " ")} · {item.yearTarget}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground flex-1">No roadmap items yet. Plan your trajectory.</p>}
          </div>
        </Link>
      </div>

      {/* Pipeline tracker */}
      <div className="rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="text-[16px] font-semibold text-slate-800">Pipeline tracker</h2><p className="text-[12px] text-slate-400">Job application stages at a glance.</p></div>
          <Link href="/jobs" className="text-[12px] text-slate-400 hover:text-emerald-600 transition-colors">see all</Link>
        </div>
        {loadingJobs ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 rounded-[24px]" />)}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                  <div className="rounded-[24px] border border-[#ebe5d8] bg-[#fdfcf8] p-4 hover:border-emerald-200 transition-colors cursor-pointer min-h-[118px]">
                    <div className={`h-9 w-9 rounded-2xl flex items-center justify-center ${item.tone}`}><Icon className="h-4 w-4" /></div>
                    <p className="mt-3 text-[13px] font-medium text-slate-700">{item.label}</p>
                    <p className="text-[24px] font-bold text-slate-800 leading-none mt-1">{item.count}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Interview prep tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Link href="/notepad" className="h-full block">
          <div className="h-full min-h-[200px] rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-800">Interview prep</h2>
                <p className="text-[12px] text-slate-400">{interviewQuestions.length} questions saved</p>
              </div>
              <MessageSquare className="h-4 w-4 text-slate-400" />
            </div>
            {interviewQuestions.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] bg-emerald-50 border border-emerald-100 p-3 text-center">
                    <p className="text-[22px] font-bold text-emerald-700">{answeredCount}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">Answered</p>
                  </div>
                  <div className="rounded-[18px] bg-amber-50 border border-amber-100 p-3 text-center">
                    <p className="text-[22px] font-bold text-amber-600">{unansweredCount}</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">Need answers</p>
                  </div>
                </div>
                {iqByCategory.length > 0 && (
                  <div className="space-y-1.5">
                    {iqByCategory.map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between rounded-[16px] border border-[#ebe5d8] bg-[#fdfcf8] px-3 py-2">
                        <span className="text-[13px] text-slate-700">{cat}</span>
                        <span className="text-[12px] font-semibold text-emerald-700">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No interview questions yet. Add them in the Notepad → Interview Prep tab.</p>
            )}
          </div>
        </Link>

        <Link href="/jobs" className="h-full block">
          <div className="h-full min-h-[200px] rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-800">Top required skills</h2>
                <p className="text-[12px] text-slate-400">From your saved jobs</p>
              </div>
              <BookOpen className="h-4 w-4 text-slate-400" />
            </div>
            <div className="space-y-2">
              {(analytics?.topSkills ?? []).slice(0, 5).map((item) => (
                <div key={item.skill} className="flex items-center justify-between rounded-[18px] border border-[#ebe5d8] bg-[#fdfcf8] px-4 py-2.5">
                  <span className="text-[13px] text-slate-700">{item.skill}</span>
                  <span className="text-[12px] font-semibold text-emerald-700">{item.count} job{item.count !== 1 ? "s" : ""}</span>
                </div>
              ))}
              {!analytics?.topSkills?.length && (
                <p className="text-sm text-muted-foreground">Save jobs with required skills to see what's most in demand.</p>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
