import { useMemo, useState, type KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Phase = "short_term" | "mid_term" | "long_term";
type Status = "planned" | "in_progress" | "completed";

type RoadmapItem = {
  id: number;
  title: string;
  description: string | null;
  yearTarget: number;
  phase: Phase;
  status: Status;
  goalId: number | null;
  order: number;
};

type Goal = {
  id: number;
  title: string;
  targetRole: string;
};

type StructuredDescription = {
  v: 2;
  focusOn: string;
  responsibilities: string[];
  skills: string[];
  level: number;
  progress: number;
};

type FormState = {
  title: string;
  yearTarget: string;
  phase: Phase;
  status: Status;
  goalId: string;
  focusOn: string;
  responsibilities: string[];
  skills: string[];
  skillDraft: string;
  level: number;
  progress: number;
};

const PHASES: {
  id: Phase;
  label: string;
  short: string;
  pillBg: string;
  pillText: string;
  colBorder: string;
  colHeader: string;
}[] = [
  { id: "short_term", label: "Short Term", short: "Short", pillBg: "bg-rose-50",   pillText: "text-rose-700",  colBorder: "border-rose-100",  colHeader: "text-rose-700" },
  { id: "mid_term",   label: "Mid Term",   short: "Mid",   pillBg: "bg-amber-50",  pillText: "text-amber-700", colBorder: "border-amber-100", colHeader: "text-amber-700" },
  { id: "long_term",  label: "Long Term",  short: "Long",  pillBg: "bg-accent",    pillText: "text-primary",   colBorder: "border-border",    colHeader: "text-primary" },
];

const LEVEL_LABELS = ["Junior", "Mid-Junior", "Mid", "Senior", "Lead"];
const MAX_FOCUS = 1000;

const emptyForm = (phase: Phase = "short_term"): FormState => ({
  title: "", yearTarget: String(new Date().getFullYear() + 1),
  phase, status: "planned", goalId: "",
  focusOn: "", responsibilities: [], skills: [], skillDraft: "", level: 1, progress: 0,
});

function parseDescription(raw: string | null): StructuredDescription | { legacy: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.v === 2) {
      return {
        v: 2,
        focusOn: typeof parsed.focusOn === "string" ? parsed.focusOn : "",
        responsibilities: Array.isArray(parsed.responsibilities)
          ? parsed.responsibilities.filter((s: unknown): s is string => typeof s === "string")
          : [],
        skills: Array.isArray(parsed.skills)
          ? parsed.skills.filter((s: unknown): s is string => typeof s === "string")
          : [],
        level: typeof parsed.level === "number" ? Math.min(5, Math.max(1, parsed.level)) : 1,
        progress: typeof parsed.progress === "number" ? Math.min(100, Math.max(0, parsed.progress)) : 0,
      };
    }
  } catch {}
  return { legacy: raw };
}

function isStructured(d: ReturnType<typeof parseDescription>): d is StructuredDescription {
  return !!d && typeof d === "object" && "v" in d && d.v === 2;
}

const serif = { fontFamily: "'DM Serif Display', serif", fontWeight: 400 };

export default function RoadmapPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const { data: items = [], isLoading } = useQuery<RoadmapItem[]>({
    queryKey: ["roadmap"],
    queryFn: () => api<RoadmapItem[]>("/roadmap"),
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => api<Goal[]>("/goals"),
  });

  const createItem = useMutation({
    mutationFn: (data: object) => api("/roadmap", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      closeDialog();
      toast({ title: "Milestone added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      api(`/roadmap/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      closeDialog();
      toast({ title: "Milestone updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) => api(`/roadmap/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      toast({ title: "Milestone deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeDialog = () => { setOpen(false); setEditingId(null); setForm(emptyForm()); };
  const openCreate = (phase: Phase = "short_term") => { setForm(emptyForm(phase)); setEditingId(null); setOpen(true); };
  const openEdit = (item: RoadmapItem) => {
    const parsed = parseDescription(item.description);
    if (parsed && isStructured(parsed)) {
      setForm({
        title: item.title, yearTarget: String(item.yearTarget),
        phase: item.phase, status: item.status,
        goalId: item.goalId ? String(item.goalId) : "",
        focusOn: parsed.focusOn, responsibilities: parsed.responsibilities,
        skills: parsed.skills, skillDraft: "", level: parsed.level, progress: parsed.progress,
      });
    } else {
      setForm({
        title: item.title, yearTarget: String(item.yearTarget),
        phase: item.phase, status: item.status,
        goalId: item.goalId ? String(item.goalId) : "",
        focusOn: parsed && "legacy" in parsed ? parsed.legacy : "",
        responsibilities: [], skills: [], skillDraft: "", level: 1,
        progress: item.status === "completed" ? 100 : item.status === "in_progress" ? 50 : 0,
      });
    }
    setEditingId(item.id); setOpen(true);
  };

  const toggleCard = (id: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addResponsibility = () => setForm((f) => ({ ...f, responsibilities: [...f.responsibilities, ""] }));
  const updateResponsibility = (i: number, value: string) =>
    setForm((f) => ({ ...f, responsibilities: f.responsibilities.map((r, idx) => idx === i ? value : r) }));
  const removeResponsibility = (i: number) =>
    setForm((f) => ({ ...f, responsibilities: f.responsibilities.filter((_, idx) => idx !== i) }));

  const addSkill = (raw: string) => {
    const skill = raw.trim().replace(/,$/, "");
    if (!skill) return;
    if (form.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setForm((f) => ({ ...f, skillDraft: "" })); return;
    }
    setForm((f) => ({ ...f, skills: [...f.skills, skill], skillDraft: "" }));
  };
  const onSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(form.skillDraft); }
    else if (e.key === "Backspace" && !form.skillDraft && form.skills.length) {
      setForm((f) => ({ ...f, skills: f.skills.slice(0, -1) }));
    }
  };

  const submit = () => {
    if (!form.title.trim()) { toast({ title: "Target role is required", variant: "destructive" }); return; }
    const description: StructuredDescription = {
      v: 2,
      focusOn: form.focusOn.trim(),
      responsibilities: form.responsibilities.map((r) => r.trim()).filter(Boolean),
      skills: form.skills,
      level: form.level,
      progress: form.progress,
    };
    const payload = {
      title: form.title.trim(),
      yearTarget: Number(form.yearTarget) || new Date().getFullYear(),
      phase: form.phase, status: form.status,
      goalId: form.goalId ? Number(form.goalId) : null,
      description, order: 0,
    };
    if (editingId) updateItem.mutate({ id: editingId, data: payload });
    else createItem.mutate(payload);
  };

  const itemsByPhase = useMemo(() => {
    const buckets: Record<Phase, RoadmapItem[]> = { short_term: [], mid_term: [], long_term: [] };
    for (const item of items) buckets[item.phase]?.push(item);
    for (const phase of Object.keys(buckets) as Phase[]) {
      buckets[phase].sort((a, b) => a.yearTarget - b.yearTarget || a.order - b.order);
    }
    return buckets;
  }, [items]);

  return (
    <div className="space-y-10 page-enter">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] text-foreground leading-tight" style={serif}>The bigger picture</h1>
          <p className="text-[14px] text-muted-foreground mt-1.5">Your 1–10 year trajectory, broken into phases.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => (v ? (editingId ? null : openCreate()) : closeDialog())}>
          <DialogTrigger asChild>
            <Button onClick={() => openCreate()} className="gap-2 text-[13px]">
              <Plus className="h-3.5 w-3.5" />
              Add Milestone
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl p-8">
            <DialogHeader className="mb-1">
              <DialogTitle className="text-[20px]" style={serif}>
                {editingId ? "Edit milestone" : "Add milestone"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Target Role</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Senior ML Engineer"
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Target Year</label>
                  <Input
                    type="number"
                    value={form.yearTarget}
                    onChange={(e) => setForm((f) => ({ ...f, yearTarget: e.target.value }))}
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
              </div>

              {/* Link to Goal */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Link to Goal (optional)</label>
                <Select value={form.goalId} onValueChange={(v) => setForm((f) => ({ ...f, goalId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="bg-secondary border-border text-[13px]">
                    <SelectValue placeholder="Select a parent goal…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No goal</SelectItem>
                    {goals.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.targetRole} — {g.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phase toggle */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Phase</label>
                <div className="grid grid-cols-3 gap-2">
                  {PHASES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, phase: p.id }))}
                      className={`py-2 rounded-lg text-[12px] font-medium border transition-colors ${
                        form.phase === p.id
                          ? `${p.pillBg} ${p.pillText} border-transparent`
                          : "border-border hover:bg-secondary text-muted-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Level slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-muted-foreground">Level</label>
                  <span className="text-[12px] font-medium text-primary">Level {form.level} · {LEVEL_LABELS[form.level - 1]}</span>
                </div>
                <Slider value={[form.level]} onValueChange={([v]) => setForm((f) => ({ ...f, level: v }))} min={1} max={5} step={1} />
                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                  {LEVEL_LABELS.map((l) => <span key={l}>{l}</span>)}
                </div>
              </div>

              {/* Focus On */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-muted-foreground">Focus On</label>
                  <span className={`text-[11px] ${form.focusOn.length > MAX_FOCUS * 0.9 ? "text-amber-500" : "text-muted-foreground"}`}>
                    {form.focusOn.length}/{MAX_FOCUS}
                  </span>
                </div>
                <Textarea
                  rows={5}
                  value={form.focusOn}
                  onChange={(e) => setForm((f) => ({ ...f, focusOn: e.target.value.slice(0, MAX_FOCUS) }))}
                  placeholder="What's the primary focus at this stage? Describe the role, environment, and key outcomes."
                  className="resize-y bg-secondary border-border text-[13px] min-h-[120px]"
                />
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-muted-foreground">Key Responsibilities</label>
                  <button type="button" onClick={addResponsibility} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.responsibilities.length === 0 && (
                    <p className="text-[12px] text-muted-foreground">No responsibilities yet.</p>
                  )}
                  {form.responsibilities.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={r}
                        onChange={(e) => updateResponsibility(i, e.target.value)}
                        placeholder={`Responsibility ${i + 1}`}
                        className="bg-secondary border-border text-[13px] flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeResponsibility(i)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Skills / Technologies</label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-secondary p-2 min-h-[44px]">
                  {form.skills.map((skill) => (
                    <span key={skill} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent text-primary">
                      {skill}
                      <button type="button" onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }))} className="hover:text-foreground transition-colors">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={form.skillDraft}
                    onChange={(e) => setForm((f) => ({ ...f, skillDraft: e.target.value }))}
                    onKeyDown={onSkillKeyDown}
                    onBlur={() => addSkill(form.skillDraft)}
                    placeholder={form.skills.length === 0 ? "Type a skill, press Enter…" : "Add more…"}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Progress */}
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
              <Button onClick={submit} disabled={createItem.isPending || updateItem.isPending} className="text-[13px]">
                {(createItem.isPending || updateItem.isPending) ? "Saving…" : "Save milestone"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 3-column phase layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {PHASES.map((phase) => {
          const list = itemsByPhase[phase.id];
          return (
            <div key={phase.id} className={`rounded-2xl border bg-card p-5 flex flex-col ${phase.colBorder}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className={`text-[14px] font-medium ${phase.colHeader}`} style={serif}>{phase.label}</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{list.length}</span>
                </div>
                <button onClick={() => openCreate(phase.id)} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              <div className="h-px bg-border mb-4" />
              {isLoading ? (
                <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}</div>
              ) : list.length > 0 ? (
                <div className="space-y-3">
                  {list.map((item, index) => (
                    <RoadmapCard
                      key={item.id}
                      item={item}
                      phase={phase}
                      index={index}
                      goals={goals}
                      expanded={expandedCards.has(item.id)}
                      onToggleExpand={() => toggleCard(item.id)}
                      onEdit={() => openEdit(item)}
                      onDelete={() => { if (confirm("Delete this milestone?")) deleteItem.mutate(item.id); }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center flex-1 border border-dashed border-border rounded-xl">
                  <p className="text-[12px] text-muted-foreground mb-2">No milestones yet</p>
                  <button onClick={() => openCreate(phase.id)} className="text-[12px] text-primary hover:underline">Add the first one</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoadmapCard({
  item, phase, index, goals, expanded, onToggleExpand, onEdit, onDelete,
}: {
  item: RoadmapItem;
  phase: typeof PHASES[number];
  index: number;
  goals: Goal[];
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const parsed = parseDescription(item.description);
  const structured = isStructured(parsed) ? parsed : null;
  const legacyText = parsed && "legacy" in parsed ? parsed.legacy : null;
  const progress = structured?.progress ?? (item.status === "completed" ? 100 : item.status === "in_progress" ? 50 : 0);
  const level = structured?.level ?? 1;
  const focusOn = structured?.focusOn ?? legacyText ?? null;
  const focusLong = (focusOn?.length ?? 0) > 120;
  const linkedGoal = item.goalId ? goals.find((g) => g.id === item.goalId) : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.05, 0.3), ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-background border border-border rounded-xl p-4 group hover:border-muted-foreground/30 transition-colors duration-150 relative"
    >
      <div className="absolute top-3 right-3 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Pencil className="h-3 w-3" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pr-14 mb-2">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${phase.pillBg} ${phase.pillText}`}>{phase.short}</span>
        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{item.yearTarget}</span>
        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">L{level} · {LEVEL_LABELS[level - 1]}</span>
      </div>

      <h3 className="text-[14px] font-medium text-foreground leading-snug mb-1">{item.title}</h3>

      {/* Linked goal badge */}
      {linkedGoal && (
        <div className="mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-primary">
            ↗ {linkedGoal.targetRole}
          </span>
        </div>
      )}

      {/* Focus On with expand */}
      {focusOn && (
        <div className="mb-3">
          <p className={`text-[12px] text-muted-foreground leading-relaxed ${!expanded && focusLong ? "line-clamp-2" : ""}`}>
            {focusOn}
          </p>
          {focusLong && (
            <button onClick={onToggleExpand} className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-1">
              {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-3 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Responsibilities — shown only when expanded */}
      {expanded && structured?.responsibilities && structured.responsibilities.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Responsibilities</p>
          <ul className="space-y-1">
            {structured.responsibilities.map((r, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills */}
      {structured?.skills && structured.skills.length > 0 && (
        <div className="pt-3 border-t border-border flex flex-wrap gap-1.5">
          {structured.skills.map((skill) => (
            <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-primary">{skill}</span>
          ))}
        </div>
      )}
    </motion.article>
  );
}
