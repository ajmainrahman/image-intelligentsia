import { useMemo, useState, type KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Map as MapIcon, Plus, Pencil, Trash2, X } from "lucide-react";
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
  order: number;
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
  focusOn: string;
  responsibilities: string[];
  skills: string[];
  skillDraft: string;
  level: number;
  progress: number;
};

const PHASES: { id: Phase; label: string; short: string; pill: string; ring: string }[] = [
  { id: "short_term", label: "Short Term", short: "Short", pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", ring: "ring-emerald-500/30" },
  { id: "mid_term",   label: "Mid Term",   short: "Mid",   pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",       ring: "ring-blue-500/30" },
  { id: "long_term",  label: "Long Term",  short: "Long",  pill: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", ring: "ring-violet-500/30" },
];

const LEVEL_LABELS = ["Junior", "Mid-Junior", "Mid", "Senior", "Lead"];

const emptyForm = (phase: Phase = "short_term"): FormState => ({
  title: "",
  yearTarget: String(new Date().getFullYear() + 1),
  phase,
  status: "planned",
  focusOn: "",
  responsibilities: [],
  skills: [],
  skillDraft: "",
  level: 1,
  progress: 0,
});

function parseDescription(raw: string | null): StructuredDescription | { legacy: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.v === 2) {
      return {
        v: 2,
        focusOn: typeof parsed.focusOn === "string" ? parsed.focusOn : "",
        responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities.filter((s: unknown): s is string => typeof s === "string") : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills.filter((s: unknown): s is string => typeof s === "string") : [],
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

export default function RoadmapPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: items = [], isLoading } = useQuery<RoadmapItem[]>({
    queryKey: ["roadmap"],
    queryFn: () => api<RoadmapItem[]>("/roadmap"),
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
        title: item.title,
        yearTarget: String(item.yearTarget),
        phase: item.phase,
        status: item.status,
        focusOn: parsed.focusOn,
        responsibilities: parsed.responsibilities,
        skills: parsed.skills,
        skillDraft: "",
        level: parsed.level,
        progress: parsed.progress,
      });
    } else {
      setForm({
        title: item.title,
        yearTarget: String(item.yearTarget),
        phase: item.phase,
        status: item.status,
        focusOn: parsed && "legacy" in parsed ? parsed.legacy : "",
        responsibilities: [],
        skills: [],
        skillDraft: "",
        level: 1,
        progress: item.status === "completed" ? 100 : item.status === "in_progress" ? 50 : 0,
      });
    }
    setEditingId(item.id);
    setOpen(true);
  };

  const addResponsibility = () =>
    setForm((f) => ({ ...f, responsibilities: [...f.responsibilities, ""] }));

  const updateResponsibility = (index: number, value: string) =>
    setForm((f) => ({
      ...f,
      responsibilities: f.responsibilities.map((r, i) => (i === index ? value : r)),
    }));

  const removeResponsibility = (index: number) =>
    setForm((f) => ({ ...f, responsibilities: f.responsibilities.filter((_, i) => i !== index) }));

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

  const submit = () => {
    if (!form.title.trim()) {
      toast({ title: "Target role is required", variant: "destructive" });
      return;
    }
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
      phase: form.phase,
      status: form.status,
      description,
      order: 0,
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
    <div className="space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Career Roadmap</h1>
          <p className="text-muted-foreground mt-1">Your structured path across short, mid, and long-term horizons.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => (v ? (editingId ? null : openCreate()) : closeDialog())}>
          <DialogTrigger asChild>
            <Button onClick={() => openCreate()} className="gap-2"><Plus className="h-4 w-4" />Add Milestone</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Target Role</label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior ML Engineer" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Target Year</label>
                  <Input type="number" value={form.yearTarget} onChange={(e) => setForm((f) => ({ ...f, yearTarget: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phase</label>
                <div className="grid grid-cols-3 gap-2">
                  {PHASES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, phase: p.id }))}
                      className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                        form.phase === p.id ? `${p.pill} border-transparent` : "border-border hover:bg-muted"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Level</label>
                  <span className="text-sm font-medium text-primary">Level {form.level} · {LEVEL_LABELS[form.level - 1]}</span>
                </div>
                <Slider value={[form.level]} onValueChange={([v]) => setForm((f) => ({ ...f, level: v }))} min={1} max={5} step={1} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Focus On</label>
                <Textarea
                  rows={2}
                  value={form.focusOn}
                  onChange={(e) => setForm((f) => ({ ...f, focusOn: e.target.value }))}
                  placeholder="Short summary of what to focus on in this role."
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Key Responsibilities</label>
                  <Button type="button" variant="ghost" size="sm" onClick={addResponsibility} className="gap-1 h-7">
                    <Plus className="h-3.5 w-3.5" />Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.responsibilities.length === 0 && (
                    <p className="text-xs text-muted-foreground">No responsibilities yet.</p>
                  )}
                  {form.responsibilities.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={r} onChange={(e) => updateResponsibility(i, e.target.value)} placeholder={`Responsibility ${i + 1}`} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeResponsibility(i)} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Skills / Technologies</label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-2 min-h-[44px]">
                  {form.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1 pl-2.5 pr-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }))}
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
                <Slider value={[form.progress]} onValueChange={([v]) => setForm((f) => ({ ...f, progress: v }))} min={0} max={100} step={5} />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button onClick={submit} disabled={createItem.isPending || updateItem.isPending}>
                {(createItem.isPending || updateItem.isPending) ? "Saving..." : "Save Milestone"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PHASES.map((phase) => {
          const list = itemsByPhase[phase.id];
          return (
            <div key={phase.id} className="rounded-xl border bg-card/60 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-7 items-center px-2.5 rounded-full text-xs font-semibold ${phase.pill}`}>
                    {phase.label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {list.length}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => openCreate(phase.id)}>
                  <Plus className="h-3.5 w-3.5" />Add
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}</div>
              ) : list.length > 0 ? (
                <div className="space-y-3">
                  {list.map((item, index) => (
                    <RoadmapCard
                      key={item.id}
                      item={item}
                      phase={phase}
                      index={index}
                      onEdit={() => openEdit(item)}
                      onDelete={() => { if (confirm("Delete this milestone?")) deleteItem.mutate(item.id); }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg flex-1">
                  <MapIcon className="h-6 w-6 mb-2 opacity-60" />
                  <p>No milestones yet.</p>
                  <Button variant="link" size="sm" onClick={() => openCreate(phase.id)} className="mt-1">Add the first one</Button>
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
  item, phase, index, onEdit, onDelete,
}: {
  item: RoadmapItem;
  phase: typeof PHASES[number];
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const parsed = parseDescription(item.description);
  const structured = isStructured(parsed) ? parsed : null;
  const legacyText = parsed && "legacy" in parsed ? parsed.legacy : null;
  const progress = structured?.progress ?? (item.status === "completed" ? 100 : item.status === "in_progress" ? 50 : 0);
  const level = structured?.level ?? 1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.05, 0.3) }}
      className="rounded-lg border bg-background p-4 group relative transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pr-16">
        <Badge variant="outline" className={`border-none ${phase.pill}`}>{phase.short}</Badge>
        <Badge variant="outline" className="font-medium">{item.yearTarget}</Badge>
        <Badge variant="outline" className="font-medium">Level {level} · {LEVEL_LABELS[level - 1]}</Badge>
      </div>

      <h3 className="mt-2 text-[15px] font-semibold leading-tight">{item.title}</h3>

      {structured?.focusOn && (
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{structured.focusOn}</p>
      )}
      {!structured && legacyText && (
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-3">{legacyText}</p>
      )}

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {structured?.responsibilities && structured.responsibilities.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Key Responsibilities</h4>
          <ul className="space-y-1">
            {structured.responsibilities.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {structured?.skills && structured.skills.length > 0 && (
        <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5">
          {structured.skills.map((skill) => (
            <span key={skill} className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium">
              {skill}
            </span>
          ))}
        </div>
      )}
    </motion.article>
  );
}
