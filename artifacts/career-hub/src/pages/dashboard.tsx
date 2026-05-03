import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Briefcase, CircleCheckBig, Clock3, XCircle, Sparkles, Pin, BookOpenCheck, Target, Brain, CheckCircle2, XCircle as XCircleIcon } from "lucide-react";
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
function DueWarningBanner() { const { user } = useAuth(); const { data } = useQuery({ queryKey: ["due-warnings"], queryFn: () => api<any>("/due-warnings"), refetchInterval: 5 * 60 * 1000, enabled: !!user }); if (!data) return null; const { overdueReminders = [], soonReminders = [], overdueGoals = [], soonGoals = [] } = data; const overdueCount = overdueReminders.length + overdueGoals.length; const soonCount = soonReminders.length + soonGoals.length; if (overdueCount === 0 && soonCount === 0) return null; return <div className="space-y-2">{overdueCount > 0 && <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3"><AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-red-700">{overdueCount} item{overdueCount > 1 ? "s" : ""} overdue</p></div></div>}{soonCount > 0 && <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3"><Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-amber-700">{soonCount} item{soonCount > 1 ? "s" : ""} due in the next 7 days</p></div></div>}</div>; }

function StatCard({ label, value, tone, sub }: { label: string; value: string | number; tone: string; sub?: string }) {
  return <div className="rounded-2xl border border-[#e4ddd2] bg-white p-4 shadow-sm"><div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><CheckCircle2 className="h-4 w-4" /></div><p className="mt-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{label}</p><div className="mt-1 text-[28px] font-bold text-slate-800 leading-none">{value}</div>{sub && <p className="mt-1 text-[12px] text-muted-foreground">{sub}</p>}</div>;
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
  const roadmapCount = `${summary?.roadmapCompleted ?? 0}/${summary?.roadmapTotal ?? 0}`;
  const remindersCount = summary?.pendingReminders ?? 0;

  return <div className="space-y-5 page-enter">
    <div className="flex items-center justify-between rounded-3xl border border-[#e4ddd2] bg-[#fdfcf8] px-5 py-4 shadow-sm">
      <div><h1 className="text-[24px] md:text-[27px] font-bold text-slate-800 leading-tight">{getGreeting()}, {firstName}</h1><p className="text-[13px] text-slate-400 mt-0.5">{dateLabel}{activeGoals.length > 0 && ` · ${activeGoals.length} active goal${activeGoals.length !== 1 ? "s" : ""}`}</p></div>
      <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[13px] flex items-center justify-center shrink-0">{initials}</div>
    </div>
    <DueWarningBanner />

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {loadingSummary ? [1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />) : (<>
        <div className="rounded-2xl border border-[#e4ddd2] bg-white p-4 shadow-sm border-l-4 border-l-emerald-500"><p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Research items</p><div className="mt-2 text-[30px] font-bold text-slate-800 leading-none">{researchCount}</div><p className="mt-1 text-[12px] text-emerald-600">{researchCount > 0 ? "tracked" : "add your reading"}</p></div>
        <div className="rounded-2xl border border-[#e4ddd2] bg-white p-4 shadow-sm border-l-4 border-l-amber-400"><p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Active goals</p><div className="mt-2 text-[30px] font-bold text-slate-800 leading-none">{summary?.activeGoals ?? 0}</div><p className="mt-1 text-[12px] text-amber-600">of {summary?.totalGoals ?? 0} total</p></div>
        <div className="rounded-2xl border border-[#e4ddd2] bg-white p-4 shadow-sm border-l-4 border-l-sky-500"><p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Learning done</p><div className="mt-2 text-[30px] font-bold text-slate-800 leading-none">{learningCount}</div><p className="mt-1 text-[12px] text-sky-600">{summary?.progressInProgress ?? 0} in progress</p></div>
        <div className="rounded-2xl border border-[#e4ddd2] bg-white p-4 shadow-sm border-l-4 border-l-orange-400"><p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Skills tracked</p><div className="mt-2 text-[30px] font-bold text-slate-800 leading-none">{skillsSet.size}</div><p className="mt-1 text-[12px] text-orange-500">from {goals.length} goal{goals.length !== 1 ? "s" : ""}</p></div>
      </>)}
    </div>

    <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4"><h2 className="text-[15px] font-semibold text-slate-800">Quick access</h2><span className="text-[12px] text-slate-400">tap to open</span></div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Goals", sub: `${summary?.activeGoals ?? 0} active`, href: "/goals", tone: "border-l-emerald-400" },
          { label: "Learning", sub: `${summary?.progressCompleted ?? 0} done`, href: "/progress", tone: "border-l-sky-400" },
          { label: "Pipeline", sub: `${summary?.totalJobs ?? 0} tracked`, href: "/jobs", tone: "border-l-violet-400" },
          { label: "Roadmap", sub: `${summary?.roadmapCompleted ?? 0}/${summary?.roadmapTotal ?? 0} done`, href: "/roadmap", tone: "border-l-amber-400" },
          { label: "Research", sub: `${researchCount} items`, href: "/research", tone: "border-l-rose-400" },
          { label: "Reminders", sub: `${remindersCount} pending`, href: "/reminders", tone: "border-l-orange-400" },
        ].map((item) => <Link key={item.label} href={item.href}><div className={`rounded-2xl border ${item.tone} bg-[#fcfbf6] p-4 shadow-sm hover:border-primary/30 transition-colors`}><p className="text-[18px] font-medium text-slate-800">{item.label}</p><p className="mt-1 text-[13px] text-slate-400">{item.sub}</p></div></Link>)}
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4"><h2 className="text-[15px] font-semibold text-slate-800">Skill gap analyzer</h2><span className="text-[12px] text-slate-400">Goals vs learning vs jobs</span></div>
        {skillGap ? <div className="space-y-3"><div className="grid grid-cols-3 gap-3"><div className="rounded-2xl bg-[#fdfcf8] border border-[#ebe5d8] p-3"><p className="text-xs text-slate-400">Coverage</p><p className="text-2xl font-bold text-slate-800">{skillGap.coveragePercent}%</p></div><div className="rounded-2xl bg-[#fdfcf8] border border-[#ebe5d8] p-3"><p className="text-xs text-slate-400">Gaps</p><p className="text-2xl font-bold text-slate-800">{skillGap.gaps.length}</p></div><div className="rounded-2xl bg-[#fdfcf8] border border-[#ebe5d8] p-3"><p className="text-xs text-slate-400">Covered</p><p className="text-2xl font-bold text-slate-800">{skillGap.covered.length}</p></div></div><div className="flex flex-wrap gap-2">{skillGap.gaps.slice(0, 8).map((gap: string) => <Badge key={gap} variant="outline" className="text-xs">{gap}</Badge>)}</div></div> : <Skeleton className="h-32 w-full rounded-2xl" />}
      </div>
      <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4"><h2 className="text-[15px] font-semibold text-slate-800">Study plan generator</h2><span className="text-[12px] text-slate-400">Next steps</span></div>
        {skillGap?.studyPlan?.length ? <div className="space-y-2">{skillGap.studyPlan.map((item: any) => <div key={item.skill} className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-3"><p className="font-medium text-slate-800">{item.skill}</p><p className="text-xs text-muted-foreground">{item.action}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Add goals and progress to generate a plan.</p>}
      </div>
    </div>

    <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4"><div><h2 className="text-[15px] font-semibold text-slate-800">Pipeline tracker</h2><p className="text-[12px] text-slate-400">Connect job search status with your dashboard.</p></div><Link href="/jobs" className="text-[12px] text-slate-400 hover:text-emerald-600 transition-colors">see all</Link></div>
      {loadingJobs ? <div className="grid grid-cols-1 md:grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div> : <div className="grid grid-cols-1 md:grid-cols-5 gap-3">{[{ label: "Saved", count: jobs.filter((j) => j.status === "saved").length, icon: Briefcase, tone: "text-slate-600 bg-slate-100" }, { label: "Applied", count: jobs.filter((j) => j.status === "applied").length, icon: Clock3, tone: "text-sky-600 bg-sky-100" }, { label: "Interviewing", count: jobs.filter((j) => j.status === "interviewing").length, icon: Sparkles, tone: "text-amber-600 bg-amber-100" }, { label: "Offered", count: jobs.filter((j) => j.status === "offered").length, icon: CircleCheckBig, tone: "text-emerald-600 bg-emerald-100" }, { label: "Rejected", count: jobs.filter((j) => j.status === "rejected").length, icon: XCircle, tone: "text-rose-600 bg-rose-100" }].map((item) => { const Icon = item.icon; return <Link key={item.label} href="/jobs"><div className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-4 hover:border-emerald-200 transition-colors cursor-pointer"><div className={`h-9 w-9 rounded-xl flex items-center justify-center ${item.tone}`}><Icon className="h-4 w-4" /></div><p className="mt-3 text-[13px] font-medium text-slate-700">{item.label}</p><p className="text-[24px] font-bold text-slate-800 leading-none mt-1">{item.count}</p></div></Link>; })}</div>}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4"><h2 className="text-[15px] font-semibold text-slate-800">Pinned items</h2><Link href="/jobs" className="text-[12px] text-slate-400 hover:text-emerald-600 transition-colors">jobs</Link></div>
        {pinnedJobs.length > 0 ? <div className="space-y-2">{pinnedJobs.slice(0, 4).map((job) => <div key={job.id} className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-3"><p className="font-medium text-slate-800">{job.title}</p><p className="text-xs text-muted-foreground">{job.company ?? "No company"}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Pin jobs to keep them here.</p>}
      </div>
      <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4"><h2 className="text-[15px] font-semibold text-slate-800">Recent learning</h2><Link href="/progress" className="text-[12px] text-slate-400 hover:text-emerald-600 transition-colors">see all</Link></div>
        {loadingProgress ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div> : <div className="space-y-3">{recentProgress.map((entry) => <div key={entry.id} className="flex items-center justify-between border-b border-[#f0ebe0] pb-2.5 last:border-0"><span className="text-[13px] text-slate-600 line-clamp-1">{entry.title}</span><span className="text-[12px] text-emerald-600 shrink-0 ml-2">{entry.durationHours > 0 ? `${entry.durationHours} hr` : entry.status.replace("_", " ")}</span></div>)}</div>}
      </div>
    </div>

    <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4"><h2 className="text-[15px] font-semibold text-slate-800">Dashboard highlights</h2><span className="text-[12px] text-slate-400">Goals, roadmap, reminders</span></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-4"><div className="flex items-center gap-2 text-slate-800 font-semibold mb-2"><Target className="h-4 w-4" />Goals</div><p className="text-2xl font-bold text-slate-800">{summary?.totalGoals ?? 0}</p><p className="text-xs text-muted-foreground">{summary?.activeGoals ?? 0} active</p></div>
        <div className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-4"><div className="flex items-center gap-2 text-slate-800 font-semibold mb-2"><BookOpenCheck className="h-4 w-4" />Roadmap</div><p className="text-2xl font-bold text-slate-800">{summary?.roadmapCompleted ?? 0}/{summary?.roadmapTotal ?? 0}</p><p className="text-xs text-muted-foreground">completed steps</p></div>
        <div className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-4"><div className="flex items-center gap-2 text-slate-800 font-semibold mb-2"><Brain className="h-4 w-4" />Reminders</div><p className="text-2xl font-bold text-slate-800">{summary?.pendingReminders ?? 0}</p><p className="text-xs text-muted-foreground">pending items</p></div>
      </div>
    </div>

    <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4"><h2 className="text-[15px] font-semibold text-slate-800">Research items</h2><Link href="/research" className="text-[12px] text-slate-400 hover:text-emerald-600 transition-colors">see all</Link></div>
      <div className="space-y-3">
        {research.slice(0, 3).map((item) => <div key={item.id} className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-4 flex items-start gap-3"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-800 truncate">{item.title}</p><span className="text-xs text-muted-foreground">{item.status.replace(/_/g, " ")}</span></div><p className="text-xs text-muted-foreground mt-1">{item.type} · {item.source ?? "No source"}</p></div></div>)}
        {research.length === 0 && <p className="text-sm text-muted-foreground">No research items yet.</p>}
      </div>
    </div>

    <div className="rounded-3xl border border-[#e4ddd2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4"><h2 className="text-[15px] font-semibold text-slate-800">Jobs summary</h2><Link href="/jobs" className="text-[12px] text-slate-400 hover:text-emerald-600 transition-colors">see all</Link></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Saved" value={jobs.filter((j) => j.status === "saved").length} tone="bg-slate-100 text-slate-700" />
        <StatCard label="Applied" value={jobs.filter((j) => j.status === "applied").length} tone="bg-sky-100 text-sky-700" />
        <StatCard label="Offered" value={jobs.filter((j) => j.status === "offered").length} tone="bg-emerald-100 text-emerald-700" />
        <StatCard label="Rejected" value={jobs.filter((j) => j.status === "rejected").length} tone="bg-rose-100 text-rose-700" />
      </div>
    </div>
  </div>;
}
