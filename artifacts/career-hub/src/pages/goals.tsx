import { useMemo, useState, type KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Target, Plus, Pencil, Trash2, Calendar, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Goal = {
  id: number;
  title: string;
  targetRole: string;
  description: string | null;
  skills: string[];
  progress: number;
  status: "active" | "completed" | "paused";
  targetYear: number | null;
  createdAt: string;
};

type GoalFormState = {
  title: string;
  targetRole: string;
  description: string;
  skills: string[];
  progress: number;
  status: Goal["status"];
  targetYear: string;
  skillDraft: string;
};

const STATUS_META: Record<Goal["status"], { label: string; pill: string; bar: string; rank: number }> = {
  active:    { label: "In Progress", pill: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",       bar: "bg-blue-500",  rank: 0 },
  paused:    { label: "Planned",     pill: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",       bar: "bg-slate-400", rank: 1 },
  completed: { label: "Achieved",    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", bar: "bg-emerald-500", rank: 2 },
};

const emptyForm = (): GoalFormState => ({
  title: "", targetRole: "", description: "", skills: [], progress: 0,
  status: "active", targetYear: String(new Date().getFullYear()), skillDraft: "",
});

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GoalFormState>(emptyForm);

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => api<Goal[]>("/goals"),
  });

  const createGoal = useMutation({
    mutationFn: (data: object) => api("/goals", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      closeDialog();
      toast({ title: "Goal created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      api(`/goals/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      closeDialog();
      toast({ title: "Goal updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteGoal = useMutation({
    mutationFn: (id: number) => api(`/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Goal deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setForm({
      title: goal.title,
      targetRole: goal.targetRole,
      description: goal.description ?? "",
      skills: goal.skills ?? [],
      progress: goal.progress ?? 0,
      status: goal.status,
      targetYear: goal.targetYear ? String(goal.targetYear) : "",
      skillDraft: "",
    });
    setEditingId(goal.id);
    setOpen(true);
  };

  const addSkill = (raw: string) => {
    const skill = raw.trim().replace(/,$/, "");
    if (!skill) return;
    if (form.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setForm((f) => ({ ...f, skillDraft: "" }));
      return;
    }
    setForm((f) => ({ ...f, skills: [...f.skills, skill], skillDraft: "" }));
  };

  const onSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(form.skillDraft);
    } else if (e.key === "Backspace" && !form.skillDraft && form.skills.length) {
      setForm((f) => ({ ...f, skills: f.skills.slice(0, -1) }));
    }
  };

  const removeSkill = (skill: string) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));

  const submit = () => {
    if (!form.title.trim() || !form.targetRole.trim()) {
      toast({ title: "Title and target role are required", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.title.trim(),
      targetRole: form.targetRole.trim(),
      description: form.description.trim() || null,
      skills: form.skills,
      progress: form.progress,
      status: form.status,
      targetYear: form.targetYear ? Number(form.targetYear) : null,
    };
    if (editingId) updateGoal.mutate({ id: editingId, data: payload });
    else createGoal.mutate(payload);
  };

  const sortedGoals = useMemo(() => {
    return [...(goals ?? [])].sort((a, b) => {
      const rank = STATUS_META[a.status].rank - STATUS_META[b.status].rank;
      if (rank !== 0) return rank;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [goals]);

  return (
    <div className="space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Career Goals</h1>
          <p className="text-muted-foreground mt-1">Define your path, target roles, and skills you’re building.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => (v ? openCreate() : closeDialog())}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Goal</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Goal" : "Create New Goal"}</DialogTitle>
              <DialogDescription>Define your target role, motivation, skills, and progress.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Goal Title</label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Transition to Machine Learning" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Target Role</label>
                  <Input value={form.targetRole} onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))} placeholder="e.g. ML Engineer" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Target Year</label>
                  <Input type="number" value={form.targetYear} onChange={(e) => setForm((f) => ({ ...f, targetYear: e.target.value }))} placeholder="2025" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Goal["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">In Progress</SelectItem>
                    <SelectItem value="paused">Planned</SelectItem>
                    <SelectItem value="completed">Achieved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Why does this goal matter to you?"
                  className="resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Skills</label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-2 min-h-[44px]">
                  {form.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1 pl-2.5 pr-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:bg-muted rounded p-0.5"
                        aria-label={`Remove ${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    value={form.skillDraft}
                    onChange={(e) => setForm((f) => ({ ...f, skillDraft: e.target.value }))}
                    onKeyDown={onSkillKeyDown}
                    onBlur={() => addSkill(form.skillDraft)}
                    placeholder="Type a skill, press Enter"
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Progress</label>
                  <span className="text-sm font-medium text-primary">{form.progress}%</span>
                </div>
                <Slider
                  value={[form.progress]}
                  onValueChange={([v]) => setForm((f) => ({ ...f, progress: v }))}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button onClick={submit} disabled={createGoal.isPending || updateGoal.isPending}>
                {(createGoal.isPending || updateGoal.isPending) ? "Saving..." : "Save Goal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </div>
      ) : sortedGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedGoals.map((goal, index) => {
            const meta = STATUS_META[goal.status];
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
              >
                <Card className="flex flex-col h-full hover-elevate group transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.pill}`}>
                          {meta.label}
                        </span>
                        <h3 className="text-lg font-semibold leading-tight line-clamp-2">{goal.targetRole}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{goal.title}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {goal.targetYear && (
                          <Badge variant="outline" className="gap-1 font-medium">
                            <Calendar className="h-3 w-3" />
                            {goal.targetYear}
                          </Badge>
                        )}
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity -mr-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(goal)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this goal?")) deleteGoal.mutate(goal.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4 pb-4">
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem]">
                      {goal.description || "No description provided yet."}
                    </p>
                    {goal.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {goal.skills.map((skill) => (
                          <span key={skill} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{goal.progress ?? 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${meta.bar} transition-all`} style={{ width: `${Math.min(100, goal.progress ?? 0)}%` }} />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/20 pt-3 pb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-primary" />
                      Created {formatDistanceToNow(new Date(goal.createdAt), { addSuffix: true })}
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/10">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"><Target className="h-8 w-8" /></div>
          <h3 className="text-xl font-semibold mb-2">No goals defined yet</h3>
          <p className="text-muted-foreground max-w-md mb-6">Start by setting a long-term career objective.</p>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Create First Goal</Button>
        </div>
      )}
    </div>
  );
}
