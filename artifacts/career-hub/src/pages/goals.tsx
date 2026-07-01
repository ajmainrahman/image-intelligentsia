import { useMemo, useState, type KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Plus, Pencil, Trash2, X, BookOpen, Map as MapIcon, ChevronDown, ChevronUp, Info, Target, Zap, Trophy, TrendingUp, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageErrorBoundary } from "@/components/page-error-boundary";

type Goal = { id: number; title: string; targetRole: string; description: string | null; skills: string[]; progress: number; status: "active"|"completed"|"paused"; targetYear: number | null; createdAt: string; };
type ProgressEntry = { id: number; goalId: number | null; status: string; durationHours: number; };
type RoadmapItem = { id: number; goalId: number | null; status: string; };
type GoalFormState = { title: string; targetRole: string; description: string; skills: string[]; progress: number; status: Goal["status"]; targetYear: string; targetHorizon: string; skillDraft: string; };

const STATUS_META = {
  active:    { label: "Active",    border: "border-l-emerald-500", dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700", bar: "#10b981", rank: 0 },
  paused:    { label: "Planned",   border: "border-l-slate-300",   dot: "bg-slate-400",   pill: "bg-slate-100 text-slate-600",   bar: "#94a3b8", rank: 1 },
  completed: { label: "Achieved",  border: "border-l-blue-400",    dot: "bg-blue-400",    pill: "bg-blue-100 text-blue-700",    bar: "#60a5fa", rank: 2 },
} as const;

const emptyForm = (): GoalFormState => ({ title: "", targetRole: "", description: "", skills: [], progress: 0, status: "active", targetYear: String(new Date().getFullYear()), targetHorizon: "short_term", skillDraft: "" });
const MAX_DESC = 1000;

// ─── Circular SVG Progress ───────────────────────────────────────────────────
function CircleProgress({ pct, size = 52, stroke = 4.5, color = "#10b981" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.min(pct, 100) / 100 * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0ebe0" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.7s ease" }} />
    </svg>
  );
}

// ─── Analytics Header ────────────────────────────────────────────────────────
function GoalsAnalytics({ goals, progressEntries, roadmapItems }: { goals: Goal[]; progressEntries: ProgressEntry[]; roadmapItems: RoadmapItem[] }) {
  const total = goals.length;
  const active = goals.filter(g => g.status === "active").length;
  const completed = goals.filter(g => g.status === "completed").length;
  const totalHours = Math.round(progressEntries.reduce((s, e) => s + (e.durationHours || 0), 0) * 10) / 10;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Skills frequency
  const skillMap = new Map<string, number>();
  for (const g of goals) for (const s of (g.skills ?? [])) skillMap.set(s, (skillMap.get(s) ?? 0) + 1);
  const topSkills = [...skillMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (total === 0) return null;

  return (
    <div className="rounded-2xl border border-[#e4ddd2] bg-white px-5 py-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-emerald-600" />
        <h2 className="text-[14px] font-semibold text-slate-800">Goal Overview</h2>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Completion ring */}
        <div className="relative flex-shrink-0 flex items-center gap-3">
          <div className="relative">
            <CircleProgress pct={completionRate} size={64} stroke={6} color="#10b981" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[13px] font-bold text-slate-800">{completionRate}%</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">Achieved</p>
            <p className="text-[22px] font-bold text-slate-800 leading-tight">{completed}<span className="text-[13px] text-slate-400 font-normal"> / {total}</span></p>
          </div>
        </div>

        <div className="h-10 w-px bg-[#f0ebe0] hidden sm:block" />

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2 flex-1">
          {[
            { label: "Active", value: active, icon: Target, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { label: "Hours logged", value: `${totalHours}h`, icon: Clock, color: "bg-sky-50 text-sky-700 border-sky-200" },
            { label: "Linked entries", value: progressEntries.filter(e => e.goalId).length, icon: BookOpen, color: "bg-violet-50 text-violet-700 border-violet-200" },
            { label: "Milestones done", value: roadmapItems.filter(r => r.status === "completed").length, icon: Trophy, color: "bg-amber-50 text-amber-700 border-amber-200" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px] font-medium ${color}`}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="font-bold">{value}</span>
              <span className="opacity-75">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Skills cloud */}
      {topSkills.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Top skills across goals</p>
          <div className="flex flex-wrap gap-1.5">
            {topSkills.map(([skill, count]) => (
              <span key={skill} className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                {skill}
                {count > 1 && <span className="text-[10px] bg-emerald-200 text-emerald-800 rounded-full px-1 font-bold">{count}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GoalsPageInner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GoalFormState>(emptyForm);
  const [expandedDesc, setExpandedDesc] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | Goal["status"]>("all");

  const { data: goals = [], isLoading } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });
  const { data: progressEntries = [] } = useQuery<ProgressEntry[]>({ queryKey: ["progress"], queryFn: () => api<ProgressEntry[]>("/progress") });
  const { data: roadmapItems = [] } = useQuery<RoadmapItem[]>({ queryKey: ["roadmap"], queryFn: () => api<RoadmapItem[]>("/roadmap") });

  const createGoal = useMutation({
    mutationFn: (data: object) => api("/goals", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); closeDialog(); toast({ title: "Goal created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateGoal = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => api(`/goals/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); closeDialog(); toast({ title: "Goal updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteGoal = useMutation({
    mutationFn: (id: number) => api(`/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); toast({ title: "Goal deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const quickStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Goal["status"] }) => api(`/goals/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const closeDialog = () => { setOpen(false); setEditingId(null); setForm(emptyForm()); };
  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setOpen(true); };
  const openEdit = (goal: Goal) => {
    setForm({ title: goal.title, targetRole: goal.targetRole, description: goal.description ?? "", skills: goal.skills ?? [], progress: goal.progress ?? 0, status: goal.status, targetYear: goal.targetYear ? String(goal.targetYear) : "", targetHorizon: "short_term", skillDraft: "" });
    setEditingId(goal.id); setOpen(true);
  };
  const addSkill = (raw: string) => {
    const skill = raw.trim().replace(/,$/, "");
    if (!skill) return;
    if (form.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) { setForm((f) => ({ ...f, skillDraft: "" })); return; }
    setForm((f) => ({ ...f, skills: [...f.skills, skill], skillDraft: "" }));
  };
  const onSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(form.skillDraft); }
    else if (e.key === "Backspace" && !form.skillDraft && form.skills.length) setForm((f) => ({ ...f, skills: f.skills.slice(0, -1) }));
  };

  const getGoalStats = (goalId: number) => {
    const lp = progressEntries.filter(e => e.goalId === goalId);
    const lr = roadmapItems.filter(r => r.goalId === goalId);
    return { progressTotal: lp.length, progressDone: lp.filter(e => e.status === "completed").length, roadmapTotal: lr.length, roadmapDone: lr.filter(r => r.status === "completed").length, hours: Math.round(lp.reduce((s, e) => s + (e.durationHours || 0), 0) * 10) / 10 };
  };
  const getEffectiveProgress = (goal: Goal) => {
    const stats = getGoalStats(goal.id);
    const totalItems = stats.progressTotal + stats.roadmapTotal;
    if (totalItems > 0) return Math.round(((stats.progressDone + stats.roadmapDone) / totalItems) * 100);
    return goal.progress ?? 0;
  };

  const editingGoalHasLinkedItems = useMemo(() => {
    if (!editingId) return false;
    const stats = getGoalStats(editingId);
    return (stats.progressTotal + stats.roadmapTotal) > 0;
  }, [editingId, progressEntries, roadmapItems]);

  const editingComputedProgress = useMemo(() => {
    if (!editingId) return 0;
    const stats = getGoalStats(editingId);
    const totalItems = stats.progressTotal + stats.roadmapTotal;
    if (totalItems > 0) return Math.round(((stats.progressDone + stats.roadmapDone) / totalItems) * 100);
    return form.progress;
  }, [editingId, progressEntries, roadmapItems, form.progress]);

  const submit = () => {
    if (!form.title.trim() || !form.targetRole.trim()) { toast({ title: "Title and target role are required", variant: "destructive" }); return; }
    const targetYear = form.targetYear.trim() ? Number(form.targetYear) : undefined;
    if (targetYear !== undefined && Number.isNaN(targetYear)) { toast({ title: "Target year must be a number", variant: "destructive" }); return; }
    const progressToSave = editingGoalHasLinkedItems ? editingComputedProgress : form.progress;
    const payload = { title: form.title.trim(), targetRole: form.targetRole.trim(), description: form.description.trim() || null, skills: form.skills, progress: progressToSave, status: form.status, ...(targetYear !== undefined ? { targetYear } : {}) };
    if (editingId) updateGoal.mutate({ id: editingId, data: payload });
    else createGoal.mutate(payload);
  };

  const toggleDesc = (id: number) => setExpandedDesc(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const sortedGoals = useMemo(() => {
    let list = [...goals].sort((a, b) => { const rank = STATUS_META[a.status].rank - STATUS_META[b.status].rank; return rank !== 0 ? rank : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
    if (statusFilter !== "all") list = list.filter(g => g.status === statusFilter);
    return list;
  }, [goals, statusFilter]);

  const statusCounts = useMemo(() => ({
    all: goals.length,
    active: goals.filter(g => g.status === "active").length,
    paused: goals.filter(g => g.status === "paused").length,
    completed: goals.filter(g => g.status === "completed").length,
  }), [goals]);

  return (
    <div className="space-y-5 page-enter pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-slate-800 leading-tight">Goals</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Track your career ambitions and measure progress.</p>
        </div>
        <Dialog open={open} onOpenChange={v => v ? openCreate() : closeDialog()}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 text-[13px] shrink-0"><Plus className="h-3.5 w-3.5" />Add Goal</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl p-8">
            <DialogHeader className="mb-1">
              <DialogTitle className="text-[20px]">{editingId ? "Edit goal" : "Create a goal"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Goal Title</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Transition to Machine Learning" className="bg-secondary border-border text-[13px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Target Role</label>
                  <Input value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))} placeholder="e.g. ML Engineer" className="bg-secondary border-border text-[13px]" />
                </div>
                <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Target Year</label>
                  <Input type="number" value={form.targetYear} onChange={e => setForm(f => ({ ...f, targetYear: e.target.value }))} placeholder="2026" className="bg-secondary border-border text-[13px]" />
                </div>
              </div>
              <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Goal Horizon</label>
                <Select value={form.targetHorizon} onValueChange={v => setForm(f => ({ ...f, targetHorizon: v }))}>
                  <SelectTrigger className="bg-secondary border-border text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_term">Short term</SelectItem>
                    <SelectItem value="long_term">Long term</SelectItem>
                    <SelectItem value="1_2_years">1-2 years</SelectItem>
                    <SelectItem value="3_5_years">3-5 years</SelectItem>
                    <SelectItem value="10_15_years">10-15 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Goal["status"] }))}>
                  <SelectTrigger className="bg-secondary border-border text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Planned</SelectItem><SelectItem value="completed">Achieved</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-muted-foreground">Description</label>
                  <span className={`text-[11px] ${form.description.length > MAX_DESC * 0.9 ? "text-amber-500" : "text-muted-foreground"}`}>{form.description.length}/{MAX_DESC}</span>
                </div>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, MAX_DESC) }))} placeholder="Why does this goal matter to you?" className="bg-secondary border-border text-[13px] min-h-[100px] resize-y" rows={4} />
              </div>
              <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Skills</label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-secondary p-2 min-h-[44px]">
                  {form.skills.map(skill => (
                    <span key={skill} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {skill}<button type="button" onClick={() => setForm(f => ({ ...f, skills: f.skills.filter(s => s !== skill) }))}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                  <input value={form.skillDraft} onChange={e => setForm(f => ({ ...f, skillDraft: e.target.value }))} onKeyDown={onSkillKeyDown} onBlur={() => addSkill(form.skillDraft)} placeholder={form.skills.length === 0 ? "Type a skill, press Enter…" : "Add more…"} className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-muted-foreground">Progress</label>
                  <span className="text-[12px] font-medium text-emerald-600">{editingGoalHasLinkedItems ? editingComputedProgress : form.progress}%</span>
                </div>
                {editingGoalHasLinkedItems ? (
                  <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                    <Info className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-[12px] text-emerald-700">Auto-calculated from linked learning entries ({editingComputedProgress}% done).</p>
                  </div>
                ) : (
                  <Slider value={[form.progress]} onValueChange={([v]) => setForm(f => ({ ...f, progress: v }))} min={0} max={100} step={5} />
                )}
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={closeDialog} className="text-[13px]">Cancel</Button>
              <Button onClick={submit} disabled={createGoal.isPending || updateGoal.isPending} className="text-[13px]">
                {(createGoal.isPending || updateGoal.isPending) ? "Saving…" : "Save goal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics */}
      {!isLoading && goals.length > 0 && (
        <GoalsAnalytics goals={goals} progressEntries={progressEntries} roadmapItems={roadmapItems} />
      )}

      {/* Status filter tabs */}
      {goals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {([
            { key: "all", label: "All", count: statusCounts.all },
            { key: "active", label: "Active", count: statusCounts.active },
            { key: "paused", label: "Planned", count: statusCounts.paused },
            { key: "completed", label: "Achieved", count: statusCounts.completed },
          ] as const).map(({ key, label, count }) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${statusFilter === key ? "bg-emerald-600 text-white shadow-sm" : "bg-[#f4f0e8] text-slate-600 hover:bg-[#e8e2d8]"}`}>
              {label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusFilter === key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Goal cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
      ) : sortedGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedGoals.map((goal, index) => {
            const meta = STATUS_META[goal.status];
            const stats = getGoalStats(goal.id);
            const effectiveProgress = getEffectiveProgress(goal);
            const isExpanded = expandedDesc.has(goal.id);
            const descLong = (goal.description?.length ?? 0) > 100;
            const hasLinkedItems = (stats.progressTotal + stats.roadmapTotal) > 0;
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.25) }}>
                <div className={`group bg-white border border-[#e4ddd2] border-l-[3px] ${meta.border} rounded-2xl p-4 flex flex-col h-full hover:shadow-md transition-all`}>
                  {/* Top row: progress ring + title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative shrink-0">
                      <CircleProgress pct={effectiveProgress} size={52} stroke={4.5} color={meta.bar} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-slate-700">{effectiveProgress}%</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.pill}`}>{meta.label}</span>
                        {goal.targetYear && <span className="text-[11px] text-slate-400">{goal.targetYear}</span>}
                      </div>
                      <Link href={`/goals/${goal.id}`}>
                        <h3 className="text-[14px] font-semibold text-slate-800 leading-snug hover:text-emerald-700 transition-colors cursor-pointer line-clamp-1">{goal.targetRole}</h3>
                      </Link>
                      <p className="text-[12px] text-slate-500 line-clamp-1 mt-0.5">{goal.title}</p>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm("Delete this goal?")) deleteGoal.mutate(goal.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <div className="mb-3">
                      <p className={`text-[12px] text-slate-500 leading-relaxed ${!isExpanded && descLong ? "line-clamp-2" : ""}`}>{goal.description}</p>
                      {descLong && (
                        <button onClick={() => toggleDesc(goal.id)} className="flex items-center gap-1 text-[11px] text-emerald-600 hover:underline mt-0.5">
                          {isExpanded ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />More</>}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Linked items progress bars */}
                  {hasLinkedItems && (
                    <div className="space-y-1.5 mb-3">
                      {stats.progressTotal > 0 && (
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3 w-3 text-sky-500 shrink-0" />
                          <div className="flex-1 h-1.5 rounded-full bg-[#f0ebe0] overflow-hidden">
                            <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${Math.round((stats.progressDone / stats.progressTotal) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">{stats.progressDone}/{stats.progressTotal} learning</span>
                        </div>
                      )}
                      {stats.roadmapTotal > 0 && (
                        <div className="flex items-center gap-2">
                          <MapIcon className="h-3 w-3 text-violet-500 shrink-0" />
                          <div className="flex-1 h-1.5 rounded-full bg-[#f0ebe0] overflow-hidden">
                            <div className="h-full bg-violet-400 rounded-full transition-all" style={{ width: `${Math.round((stats.roadmapDone / stats.roadmapTotal) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">{stats.roadmapDone}/{stats.roadmapTotal} milestones</span>
                        </div>
                      )}
                      {stats.hours > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="text-[11px] text-slate-500">{stats.hours}h invested</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Skills */}
                  {(goal.skills?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(goal.skills ?? []).slice(0, 5).map(skill => <span key={skill} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">{skill}</span>)}
                      {(goal.skills?.length ?? 0) > 5 && <span className="text-[10px] text-slate-400">+{(goal.skills?.length ?? 0) - 5}</span>}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-auto pt-3 border-t border-[#f0ebe0] flex items-center justify-between">
                    <p className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(goal.createdAt), { addSuffix: true })}</p>
                    <div className="flex items-center gap-1.5">
                      {/* Quick status cycle */}
                      {goal.status !== "completed" && (
                        <button onClick={() => quickStatus.mutate({ id: goal.id, status: goal.status === "active" ? "completed" : "active" })}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-[#e4ddd2] text-slate-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                          {goal.status === "active" ? "Mark achieved" : "Set active"}
                        </button>
                      )}
                      <Link href={`/goals/${goal.id}`}>
                        <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 text-emerald-600">Detail →</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : goals.length > 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-[#e4ddd2]">
          <p className="text-[14px] text-muted-foreground">No goals match this filter.</p>
          <button onClick={() => setStatusFilter("all")} className="text-[13px] text-emerald-600 hover:underline mt-1">Show all</button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[#e4ddd2] rounded-2xl">
          <Target className="h-10 w-10 text-slate-200 mb-3" />
          <p className="text-[15px] font-medium text-foreground mb-1">No goals yet</p>
          <p className="text-[13px] text-muted-foreground mb-5 max-w-xs">Set your first career objective to start tracking progress.</p>
          <Button onClick={openCreate} size="sm" className="gap-1.5 text-[13px]"><Plus className="h-3.5 w-3.5" />Create first goal</Button>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  return <PageErrorBoundary message="Could not load your goals — please refresh"><GoalsPageInner /></PageErrorBoundary>;
}
