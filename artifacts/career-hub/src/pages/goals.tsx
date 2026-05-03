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
import { Plus, Pencil, Trash2, X, BookOpen, Map as MapIcon, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Goal = { id: number; title: string; targetRole: string; description: string | null; skills: string[]; progress: number; status: "active"|"completed"|"paused"; targetYear: number | null; createdAt: string; };
type ProgressEntry = { id: number; goalId: number | null; status: string; };
type RoadmapItem = { id: number; goalId: number | null; status: string; };
type GoalFormState = { title: string; targetRole: string; description: string; skills: string[]; progress: number; status: Goal["status"]; targetYear: string; targetHorizon: string; skillDraft: string; };
type StatusMeta = { label: string; pillBg: string; pillText: string; barColor: string; rank: number };

const STATUS_META: Record<Goal["status"], StatusMeta> = {
  active:    { label: "In Progress", pillBg: "bg-accent",     pillText: "text-primary",         barColor: "bg-primary",     rank: 0 },
  paused:    { label: "Planned",     pillBg: "bg-secondary",  pillText: "text-muted-foreground", barColor: "bg-border",      rank: 1 },
  completed: { label: "Achieved",    pillBg: "bg-emerald-50", pillText: "text-emerald-700",       barColor: "bg-emerald-500", rank: 2 },
};

const emptyForm = (): GoalFormState => ({ title: "", targetRole: "", description: "", skills: [], progress: 0, status: "active", targetYear: String(new Date().getFullYear()), targetHorizon: "short_term", skillDraft: "" });
const MAX_DESC = 1000;

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GoalFormState>(emptyForm);
  const [expandedDesc, setExpandedDesc] = useState<Set<number>>(new Set());

  const { data: goals, isLoading } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });
  const { data: progressEntries = [] } = useQuery<ProgressEntry[]>({ queryKey: ["progress"], queryFn: () => api<ProgressEntry[]>("/progress") });
  const { data: roadmapItems = [] } = useQuery<RoadmapItem[]>({ queryKey: ["roadmap"], queryFn: () => api<RoadmapItem[]>("/roadmap") });

  const createGoal = useMutation({
    mutationFn: (data: object) => api("/goals", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); queryClient.invalidateQueries({ queryKey: ["activity"] }); closeDialog(); toast({ title: "Goal created" }); },
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
  const submit = () => {
    if (!form.title.trim() || !form.targetRole.trim()) { toast({ title: "Title and target role are required", variant: "destructive" }); return; }
    const targetYear = form.targetYear.trim() ? Number(form.targetYear) : undefined;
    if (targetYear !== undefined && Number.isNaN(targetYear)) {
      toast({ title: "Target year must be a number", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.title.trim(),
      targetRole: form.targetRole.trim(),
      description: form.description.trim() || null,
      skills: form.skills,
      progress: form.progress,
      status: form.status,
      ...(targetYear !== undefined ? { targetYear } : {}),
    };
    if (editingId) updateGoal.mutate({ id: editingId, data: payload });
    else createGoal.mutate(payload);
  };
  const toggleDesc = (id: number) => setExpandedDesc((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const getGoalStats = (goalId: number) => {
    const lp = progressEntries.filter((e) => e.goalId === goalId);
    const lr = roadmapItems.filter((r) => r.goalId === goalId);
    return { progressTotal: lp.length, progressDone: lp.filter((e) => e.status === "completed").length, roadmapTotal: lr.length, roadmapDone: lr.filter((r) => r.status === "completed").length };
  };
  const sortedGoals = useMemo(() => [...(goals ?? [])].sort((a, b) => { const rank = STATUS_META[a.status].rank - STATUS_META[b.status].rank; return rank !== 0 ? rank : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); }), [goals]);

  return (
    <div className="space-y-10 page-enter">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-foreground leading-tight">What you're working toward</h1>
          <p className="text-[14px] text-muted-foreground mt-1.5">Track your career ambitions and the skills that get you there.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => (v ? openCreate() : closeDialog())}>
          <DialogTrigger asChild>
            <Button className="gap-2 text-[13px]"><Plus className="h-3.5 w-3.5" />Add Goal</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl p-8">
            <DialogHeader className="mb-1">
              <DialogTitle className="text-[20px]">{editingId ? "Edit goal" : "Create a goal"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Goal Title</label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Transition to Machine Learning" className="bg-secondary border-border text-[13px]" />
              </div>
      <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Target Role</label>
                  <Input value={form.targetRole} onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))} placeholder="e.g. ML Engineer" className="bg-secondary border-border text-[13px]" />
                </div>
                <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Target Year</label>
                  <Input type="number" value={form.targetYear} onChange={(e) => setForm((f) => ({ ...f, targetYear: e.target.value }))} placeholder="2026" className="bg-secondary border-border text-[13px]" />
                </div>
              </div>
      <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Goal Horizon</label>
        <Select value={form.targetHorizon} onValueChange={(v) => setForm((f) => ({ ...f, targetHorizon: v }))}>
          <SelectTrigger className="bg-secondary border-border text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="short_term">Short term goals</SelectItem>
            <SelectItem value="long_term">Long term goals</SelectItem>
            <SelectItem value="1_2_years">1-2 years</SelectItem>
            <SelectItem value="3_5_years">3-5 years</SelectItem>
            <SelectItem value="10_15_years">10-15 years</SelectItem>
          </SelectContent>
        </Select>
      </div>
              <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Goal["status"] }))}>
                  <SelectTrigger className="bg-secondary border-border text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">In Progress</SelectItem><SelectItem value="paused">Planned</SelectItem><SelectItem value="completed">Achieved</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-muted-foreground">Description</label>
                  <span className={`text-[11px] ${form.description.length > MAX_DESC * 0.9 ? "text-amber-500" : "text-muted-foreground"}`}>{form.description.length}/{MAX_DESC}</span>
                </div>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, MAX_DESC) }))} placeholder="Why does this goal matter to you?" className="bg-secondary border-border text-[13px] min-h-[120px] resize-y" rows={5} />
              </div>
              <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Skills</label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-secondary p-2 min-h-[44px]">
                  {form.skills.map((skill) => (
                    <span key={skill} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent text-primary">
                      {skill}<button type="button" onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }))} className="hover:text-foreground transition-colors"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                  <input value={form.skillDraft} onChange={(e) => setForm((f) => ({ ...f, skillDraft: e.target.value }))} onKeyDown={onSkillKeyDown} onBlur={() => addSkill(form.skillDraft)}
                    placeholder={form.skills.length === 0 ? "Type a skill, press Enter…" : "Add more…"}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-muted-foreground">Progress</label>
                  <span className="text-[12px] font-medium text-primary">{form.progress}%</span>
                </div>
                <Slider value={[form.progress]} onValueChange={([v]) => setForm((f) => ({ ...f, progress: v }))} min={0} max={100} step={5} />
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}</div>
      ) : sortedGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sortedGoals.map((goal, index) => {
            const meta = STATUS_META[goal.status];
            const stats = getGoalStats(goal.id);
            const isExpanded = expandedDesc.has(goal.id);
            const descLong = (goal.description?.length ?? 0) > 120;
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}>
                <div className="group bg-card border border-border rounded-2xl p-5 flex flex-col h-full hover:border-muted-foreground/30 transition-colors duration-150">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="space-y-1.5 min-w-0">
                      <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full ${meta.pillBg} ${meta.pillText}`}>{meta.label}</span>
                      {/* Clickable title → goal detail page */}
                      <Link href={`/goals/${goal.id}`}>
                        <h3 className="text-[15px] font-medium text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
                          {goal.targetRole} <ExternalLink className="h-3 w-3 opacity-40" />
                        </h3>
                      </Link>
                      <p className="text-[12px] text-muted-foreground line-clamp-1">{goal.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {goal.targetYear && <span className="text-[11px] text-muted-foreground">{goal.targetYear}</span>}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { if (confirm("Delete this goal?")) deleteGoal.mutate(goal.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                  {goal.description && (
                    <div className="mb-4">
                      <p className={`text-[13px] text-muted-foreground leading-relaxed ${!isExpanded && descLong ? "line-clamp-2" : ""}`}>{goal.description}</p>
                      {descLong && (
                        <button onClick={() => toggleDesc(goal.id)} className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-1">
                          {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
                        </button>
                      )}
                    </div>
                  )}
                  {!goal.description && <p className="text-[13px] text-muted-foreground mb-4 flex-1">No description added yet.</p>}
                  {(stats.progressTotal > 0 || stats.roadmapTotal > 0) && (
                    <div className="flex gap-3 mb-4">
                      {stats.progressTotal > 0 && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-lg px-2.5 py-1.5"><BookOpen className="h-3 w-3 text-primary" /><span>{stats.progressDone}/{stats.progressTotal} learning</span></div>}
                      {stats.roadmapTotal > 0 && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-lg px-2.5 py-1.5"><MapIcon className="h-3 w-3 text-primary" /><span>{stats.roadmapDone}/{stats.roadmapTotal} milestones</span></div>}
                    </div>
                  )}
                  {goal.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">{goal.skills.map((skill) => <span key={skill} className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-primary">{skill}</span>)}</div>
                  )}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Progress</span><span className="font-medium text-foreground">{goal.progress ?? 0}%</span></div>
                    <div className="h-1 w-full bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full ${meta.barColor} transition-all duration-500`} style={{ width: `${Math.min(100, goal.progress ?? 0)}%` }} /></div>
                  </div>
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">Created {formatDistanceToNow(new Date(goal.createdAt), { addSuffix: true })}</p>
                    <Link href={`/goals/${goal.id}`}>
                      <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 text-muted-foreground hover:text-primary">View detail →</Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-2xl">
          <p className="text-[15px] font-medium text-foreground mb-1">No goals defined yet</p>
          <p className="text-[13px] text-muted-foreground mb-6 max-w-xs">Start by setting a long-term career objective.</p>
          <Button onClick={openCreate} className="gap-2 text-[13px]"><Plus className="h-3.5 w-3.5" />Create first goal</Button>
        </div>
      )}
    </div>
  );
}
