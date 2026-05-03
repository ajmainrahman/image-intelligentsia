import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Briefcase, CircleCheckBig, Clock3, XCircle, Sparkles, Target, Brain, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";

type Summary = { totalGoals: number; activeGoals: number; progressCompleted: number; progressInProgress: number; totalJobs: number; appliedJobs: number; pendingReminders: number; roadmapCompleted: number; roadmapTotal: number; pinnedJobs?: number; };
type Goal = { id: number; title: string; progress: number; status: string; skills: string[] };
type ResearchItem = { id: number; title: string; type: string; status: string; tags: string[]; authors: string | null; source: string | null; };
type ProgressEntry = { id: number; title: string; category: string; durationHours: number; status: string; createdAt: string; };
type Job = { id: number; title: string; company: string | null; status: string; pinned: boolean; interviewQuestions: string[]; };
type Analytics = { totalJobs: number; pinned: number; interviewCount: number; questionsCount: number; topSkills: { skill: string; count: number }[]; };

function getGreeting(): string { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening"; }
function DueWarningBanner() { const { user } = useAuth(); const { data } = useQuery({ queryKey: ["due-warnings"], queryFn: () => api<any>("/due-warnings"), refetchInterval: 5 * 60 * 1000, enabled: !!user }); if (!data) return null; const { overdueReminders = [], soonReminders = [], overdueGoals = [], soonGoals = [] } = data; const overdueCount = overdueReminders.length + overdueGoals.length; const soonCount = soonReminders.length + soonGoals.length; if (overdueCount === 0 && soonCount === 0) return null; return <div className="space-y-2">{overdueCount > 0 && <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-3xl px-5 py-4"><AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-red-700">{overdueCount} item{overdueCount > 1 ? "s" : ""} overdue</p></div></div>}{soonCount > 0 && <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-3xl px-5 py-4"><Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-amber-700">{soonCount} item{soonCount > 1 ? "s" : ""} due in the next 7 days</p></div></div>}</div>; }

function StatCard({ label, value, tone, sub, href }: { label: string; value: string | number; tone: string; sub?: string; href: string }) {
  return <Link href={href}><div className="rounded-[28px] border border-[#e4ddd2] bg-white p-5 shadow-sm min-h-[132px] cursor-pointer hover:border-emerald-200 transition-colors"><div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><CheckCircle2 className="h-5 w-5" /></div><p className="mt-4 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{label}</p><div className="mt-1 text-[34px] font-bold text-slate-800 leading-none">{value}</div>{sub && <p className="mt-2 text-[12px] text-muted-foreground">{sub}</p>}</div></Link>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading: loadingSummary } = useQuery<Summary>({ queryKey: ["dashboard-summary"], queryFn: () => api<Summary>("/dashboard/summary") });
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });
  const { data: research = [] } = useQuery<ResearchItem[]>({ queryKey: ["research"], queryFn: () => api<ResearchItem[]>("/research") });
  const { data: progressEntries = [], isLoading: loadingProgress } = useQuery<ProgressEntry[]>({ queryKey: ["progress"], queryFn: () => api<ProgressEntry[]>("/progress") });
  const { data: jobs = [], isLoading: loadingJobs } = useQuery<Job[]>({ queryKey: ["jobs"], queryFn: () => api<Job[]>("/jobs") });
  const { data: skillGap } = useQuery<any>({ queryKey: ["skill-gap"], queryFn: () => api<any>("/dashboard/skill-gap") });
  const { data: analytics } = useQuery<Analytics>({ queryKey: ["jobs-analytics"], queryFn: () => api<Analytics>("/jobs/analytics") });
  const activeGoals = goals.filter(g => g.status === "active");
  const recentProgress = [...progressEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const pinnedJobs = jobs.filter((j) => j.pinned);
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const initials = user?.name ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?";
  const dateLabel = format(new Date(), "EEEE, d MMM yyyy");
  const skillsSet = useMemo(() => { const s = new Set<string>(); for (const g of goals) for (const sk of g.skills ?? []) s.add(sk.toLowerCase().trim()); return s; }, [goals]);
  const researchCount = research.length;
  const learningCount = summary?.progressCompleted ?? 0;
  const remindersCount = summary?.pendingReminders ?? 0;

  return <div className="space-y-6 page-enter pb-8">
    <div className="flex items-center justify-between rounded-[28px] border border-[#e4ddd2] bg-[#fdfcf8] px-6 py-5 shadow-sm">
      <div>
        <h1 className="text-[24px] md:text-[27px] font-bold text-slate-800 leading-tight">{getGreeting()}, {firstName}</h1>
        <p className="text-[13px] text-slate-400 mt-0.5">{dateLabel}{activeGoals.length > 0 && ` · ${activeGoals.length} active goal${activeGoals.length !== 1 ? "s" : ""}`}</p>
      </div>
      <div className="flex flex-col items-end gap-2 text-right">
        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[13px] flex items-center justify-center shrink-0">{initials}</div>
        <div className="text-[12px] text-slate-400">
          <p>{summary?.pendingReminders ?? 0} due</p>
          <p>{summary?.roadmapCompleted ?? 0}/{summary?.roadmapTotal ?? 0} roadmap</p>
        </div>
      </div>
    </div>

    <DueWarningBanner />

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {loadingSummary ? [1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-[28px]" />) : (<>
        <StatCard label="Research items" value={researchCount} tone="bg-emerald-100 text-emerald-700" sub={researchCount > 0 ? "tracked" : "add your reading"} href="/research" />
        <StatCard label="Active goals" value={summary?.activeGoals ?? 0} tone="bg-amber-100 text-amber-700" sub={`of ${summary?.totalGoals ?? 0} total`} href="/goals" />
        <StatCard label="Learning done" value={learningCount} tone="bg-sky-100 text-sky-700" sub={`${summary?.progressInProgress ?? 0} in progress`} href="/progress" />
        <StatCard label="Skills tracked" value={skillsSet.size} tone="bg-orange-100 text-orange-700" sub={`from ${goals.length} goal${goals.length !== 1 ? "s" : ""}`} href="/goals" />
      </>)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Link href="/goals"><div className="rounded-[32px] border border-[#e4ddd2] bg-white p-6 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors"><div className="flex items-center justify-between mb-5"><h2 className="text-[16px] font-semibold text-slate-800">Goals progress</h2><span className="text-[12px] text-slate-400">{summary?.activeGoals ?? 0} active</span></div>{goals.length ? <div className="space-y-4">{goals.slice(0, 4).map((goal) => <div key={goal.id} className="space-y-2"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-700">{goal.title}</p><span className="text-sm text-slate-400">{goal.progress}%</span></div><div className="h-1.5 rounded-full bg-[#f0ebe0] overflow-hidden"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${goal.progress}%` }} /></div></div>)}</div> : <p className="text-sm text-muted-foreground">No goals yet.</p>}</div></Link>
      <Link href="/research"><div className="rounded-[32px] border border-[#e4ddd2] bg-white p-6 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors"><div className="flex items-center justify-between mb-5"><h2 className="text-[16px] font-semibold text-slate-800">Research items</h2><span className="text-[12px] text-slate-400">see all</span></div><div className="space-y-3">{research.slice(0, 5).map((item) => <div key={item.id} className="rounded-[22px] border border-[#ebe5d8] bg-[#fdfcf8] p-4 flex items-start gap-3"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-800 truncate">{item.title}</p><span className="text-xs text-muted-foreground">{item.status.replace(/_/g, " ")}</span></div><p className="text-xs text-muted-foreground mt-1">{item.type} · {item.source ?? "No source"}</p></div></div>)}{research.length === 0 && <p className="text-sm text-muted-foreground">No research items yet.</p>}</div></div></Link>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Link href="/progress"><div className="rounded-[32px] border border-[#e4ddd2] bg-white p-6 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors"><div className="flex items-center justify-between mb-5"><h2 className="text-[16px] font-semibold text-slate-800">Recent learning</h2><span className="text-[12px] text-slate-400">14 days</span></div><div className="space-y-3"><div className="flex items-center gap-2 pb-2"><span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">M</span><span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">T</span><span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">W</span><span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">T</span><span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">F</span><span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">S</span><span className="text-xs text-white bg-emerald-600 px-2.5 py-1 rounded-full">S</span></div>{recentProgress.map((entry) => <div key={entry.id} className="flex items-center justify-between border-b border-[#f0ebe0] pb-2.5 last:border-0"><span className="text-[13px] text-slate-600 line-clamp-1">{entry.title}</span><span className="text-[12px] text-emerald-600 shrink-0 ml-2">{entry.durationHours > 0 ? `${entry.durationHours} hr` : entry.status.replace("_", " ")}</span></div>)}</div></div></Link>
      <Link href="/jobs"><div className="rounded-[32px] border border-[#e4ddd2] bg-white p-6 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors"><div className="flex items-center justify-between mb-5"><h2 className="text-[16px] font-semibold text-slate-800">Skill gap analyzer</h2><span className="text-[12px] text-slate-400">Goals vs learning vs jobs</span></div>{skillGap ? <div className="space-y-4"><div className="grid grid-cols-3 gap-3"><div className="rounded-[22px] bg-[#fdfcf8] border border-[#ebe5d8] p-4"><p className="text-xs text-slate-400">Coverage</p><p className="text-2xl font-bold text-slate-800">{skillGap.coveragePercent}%</p></div><div className="rounded-[22px] bg-[#fdfcf8] border border-[#ebe5d8] p-4"><p className="text-xs text-slate-400">Gaps</p><p className="text-2xl font-bold text-slate-800">{skillGap.gaps.length}</p></div><div className="rounded-[22px] bg-[#fdfcf8] border border-[#ebe5d8] p-4"><p className="text-xs text-slate-400">Covered</p><p className="text-2xl font-bold text-slate-800">{skillGap.covered.length}</p></div></div><div className="flex flex-wrap gap-2">{skillGap.gaps.slice(0, 8).map((gap: string) => <Badge key={gap} variant="outline" className="text-xs">{gap}</Badge>)}</div></div> : <Skeleton className="h-36 w-full rounded-[28px]" />}</div></Link>
    </div>

    <div className="rounded-[32px] border border-[#e4ddd2] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5"><div><h2 className="text-[16px] font-semibold text-slate-800">Pipeline tracker</h2><p className="text-[12px] text-slate-400">Connect job search status with your dashboard.</p></div><Link href="/jobs" className="text-[12px] text-slate-400 hover:text-emerald-600 transition-colors">see all</Link></div>
      {loadingJobs ? <div className="grid grid-cols-1 md:grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-32 rounded-[28px]" />)}</div> : <div className="grid grid-cols-1 md:grid-cols-5 gap-4">{[{ label: "Saved", count: jobs.filter((j) => j.status === "saved").length, icon: Briefcase, tone: "text-slate-600 bg-slate-100" }, { label: "Applied", count: jobs.filter((j) => j.status === "applied").length, icon: Clock3, tone: "text-sky-600 bg-sky-100" }, { label: "Interviewing", count: jobs.filter((j) => j.status === "interviewing").length, icon: Sparkles, tone: "text-amber-600 bg-amber-100" }, { label: "Offered", count: jobs.filter((j) => j.status === "offered").length, icon: CircleCheckBig, tone: "text-emerald-600 bg-emerald-100" }, { label: "Rejected", count: jobs.filter((j) => j.status === "rejected").length, icon: XCircle, tone: "text-rose-600 bg-rose-100" }].map((item) => { const Icon = item.icon; return <Link key={item.label} href="/jobs"><div className="rounded-[28px] border border-[#ebe5d8] bg-[#fdfcf8] p-5 hover:border-emerald-200 transition-colors cursor-pointer min-h-[132px]"><div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${item.tone}`}><Icon className="h-5 w-5" /></div><p className="mt-4 text-[14px] font-medium text-slate-700">{item.label}</p><p className="text-[28px] font-bold text-slate-800 leading-none mt-1">{item.count}</p></div></Link>; })}</div>}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Link href="/jobs"><div className="rounded-[32px] border border-[#e4ddd2] bg-white p-6 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors"><div className="flex items-center justify-between mb-5"><h2 className="text-[16px] font-semibold text-slate-800">Pinned items</h2><span className="text-[12px] text-slate-400">jobs</span></div>{pinnedJobs.length > 0 ? <div className="space-y-2.5">{pinnedJobs.slice(0, 4).map((job) => <div key={job.id} className="rounded-[22px] border border-[#ebe5d8] bg-[#fdfcf8] p-4"><p className="font-medium text-slate-800">{job.title}</p><p className="text-xs text-muted-foreground">{job.company ?? "No company"}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Pin jobs to keep them here.</p>}</div></Link>
      <Link href="/jobs"><div className="rounded-[32px] border border-[#e4ddd2] bg-white p-6 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors"><div className="flex items-center justify-between mb-5"><h2 className="text-[16px] font-semibold text-slate-800">Interview prep tracking</h2><span className="text-[12px] text-slate-400">see all</span></div><div className="space-y-3">{(analytics?.topSkills ?? []).slice(0, 4).map((item) => <div key={item.skill} className="flex items-center justify-between rounded-[22px] border border-[#ebe5d8] bg-[#fdfcf8] px-4 py-3"><span className="text-sm text-slate-700">{item.skill}</span><span className="text-sm font-semibold text-emerald-700">{item.count}</span></div>)}{!analytics?.topSkills?.length && <p className="text-sm text-muted-foreground">No interview prep data yet.</p>}</div></div></Link>
    </div>
  </div>;
}
