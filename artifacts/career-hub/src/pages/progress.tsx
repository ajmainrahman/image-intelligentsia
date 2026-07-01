import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, ExternalLink, Search, Flame, Clock, TrendingUp, CheckCircle2, ChevronDown, ChevronUp, BarChart2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageErrorBoundary } from "@/components/page-error-boundary";

type ProgressEntry = {
  id: number; title: string; category: string; description: string | null;
  status: "not_started" | "in_progress" | "completed"; toolOrResource: string | null;
  resourceUrl: string | null; durationHours: number; startDate: string | null;
  completedAt: string | null; goalId: number | null; createdAt: string;
};
type Goal = { id: number; title: string; targetRole: string };
type FormState = {
  title: string; category: string; description: string;
  status: ProgressEntry["status"]; toolOrResource: string;
  resourceUrl: string; durationHours: string;
  startDate: string; completedAt: string; goalId: string;
};

const CATEGORIES = [
  { id: "course",        label: "Course",        bg: "bg-sky-100",     text: "text-sky-700",     bar: "#38bdf8" },
  { id: "project",       label: "Project",       bg: "bg-violet-100",  text: "text-violet-700",  bar: "#a78bfa" },
  { id: "certification", label: "Cert",          bg: "bg-amber-100",   text: "text-amber-700",   bar: "#fbbf24" },
  { id: "ai_tool",       label: "AI Tool",       bg: "bg-rose-100",    text: "text-rose-700",    bar: "#fb7185" },
  { id: "book",          label: "Book",          bg: "bg-emerald-100", text: "text-emerald-700", bar: "#34d399" },
  { id: "practice",      label: "Practice",      bg: "bg-orange-100",  text: "text-orange-700",  bar: "#fb923c" },
  { id: "tool",          label: "Tool",          bg: "bg-teal-100",    text: "text-teal-700",    bar: "#2dd4bf" },
  { id: "reading",       label: "Reading",       bg: "bg-indigo-100",  text: "text-indigo-700",  bar: "#818cf8" },
  { id: "other",         label: "Other",         bg: "bg-slate-100",   text: "text-slate-600",   bar: "#94a3b8" },
] as const;

const STATUS_META: Record<ProgressEntry["status"], { label: string; bg: string; text: string; dot: string }> = {
  not_started: { label: "Not Started", bg: "bg-slate-100",    text: "text-slate-600",   dot: "bg-slate-400" },
  in_progress:  { label: "In Progress", bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400" },
  completed:    { label: "Completed",   bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
};

const FILTER_TABS = [
  { id: "all", label: "All" }, { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" }, { id: "course", label: "Course" },
  { id: "project", label: "Project" }, { id: "certification", label: "Cert" },
  { id: "ai_tool", label: "AI Tool" }, { id: "book", label: "Book" },
];

const MAX_NOTES = 1000;
const emptyForm = (): FormState => ({ title: "", category: "course", description: "", status: "not_started", toolOrResource: "", resourceUrl: "", durationHours: "0", startDate: "", completedAt: "", goalId: "" });

function categoryMeta(id: string) { return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]; }

// ─── Date helpers (local timezone, no UTC offset) ───────────────────────────
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function startOfLocalDay(date: Date): Date {
  const d = new Date(date); d.setHours(0, 0, 0, 0); return d;
}

// ─── Heatmap (fixed: local date keys) ───────────────────────────────────────
function buildHeatmap(entries: ProgressEntry[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = localDateKey(new Date(entry.createdAt));
    totals.set(key, (totals.get(key) ?? 0) + (entry.durationHours || 0));
  }
  const today = startOfLocalDay(new Date());
  const dayOfWeek = today.getDay();
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - dayOfWeek);
  const weeks: { date: Date; key: string; hours: number; isFuture: boolean }[][] = [];
  for (let w = 11; w >= 0; w--) {
    const week: { date: Date; key: string; hours: number; isFuture: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(lastSunday);
      date.setDate(lastSunday.getDate() - w * 7 + d);
      const key = localDateKey(date);
      week.push({ date, key, hours: totals.get(key) ?? 0, isFuture: date > today });
    }
    weeks.push(week);
  }
  return weeks;
}

function heatmapColor(hours: number, isFuture: boolean) {
  if (isFuture) return "bg-transparent border border-dashed border-border/30";
  if (hours <= 0) return "bg-slate-100";
  if (hours < 2) return "bg-emerald-200";
  if (hours < 5) return "bg-emerald-400";
  return "bg-emerald-600";
}

// ─── Weekly bar chart ────────────────────────────────────────────────────────
function buildWeeklyChart(entries: ProgressEntry[]) {
  const today = startOfLocalDay(new Date());
  const weeks: { label: string; hours: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const hours = entries
      .filter(e => { const d = new Date(e.createdAt); return d >= weekStart && d < weekEnd; })
      .reduce((sum, e) => sum + (e.durationHours || 0), 0);
    weeks.push({ label: w === 0 ? "This wk" : format(weekStart, "MMM d"), hours: Math.round(hours * 10) / 10 });
  }
  return weeks;
}

function computeStats(entries: ProgressEntry[]) {
  const now = new Date();
  const startOfWeek = startOfLocalDay(new Date(now));
  startOfWeek.setDate(startOfWeek.getDate() - now.getDay());
  const totalHours = entries.reduce((sum, e) => sum + (e.durationHours || 0), 0);
  const hoursThisWeek = entries.filter(e => new Date(e.createdAt) >= startOfWeek).reduce((s, e) => s + (e.durationHours || 0), 0);
  const days = new Set<string>();
  for (const e of entries) days.add(localDateKey(new Date(e.createdAt)));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const day = startOfLocalDay(new Date(now)); day.setDate(day.getDate() - i);
    if (days.has(localDateKey(day))) streak += 1;
    else if (i === 0) continue;
    else break;
  }
  return {
    totalHours: Math.round(totalHours * 10) / 10,
    hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
    streak,
    completed: entries.filter(e => e.status === "completed").length,
    inProgress: entries.filter(e => e.status === "in_progress").length,
    completionRate: entries.length > 0 ? Math.round((entries.filter(e => e.status === "completed").length / entries.length) * 100) : 0,
  };
}

// ─── Category breakdown ──────────────────────────────────────────────────────
function CategoryBreakdown({ entries }: { entries: ProgressEntry[] }) {
  const catData = useMemo(() => {
    const map = new Map<string, { hours: number; count: number }>();
    for (const e of entries) {
      const cur = map.get(e.category) ?? { hours: 0, count: 0 };
      map.set(e.category, { hours: cur.hours + (e.durationHours || 0), count: cur.count + 1 });
    }
    return CATEGORIES
      .map(c => ({ ...c, hours: Math.round((map.get(c.id)?.hours ?? 0) * 10) / 10, count: map.get(c.id)?.count ?? 0 }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.hours - a.hours);
  }, [entries]);

  const maxHours = Math.max(...catData.map(c => c.hours), 1);
  if (catData.length === 0) return null;

  return (
    <div className="bg-white border border-[#e4ddd2] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="h-4 w-4 text-emerald-600" />
        <h2 className="text-[14px] font-semibold text-slate-800">By Category</h2>
        <span className="ml-auto text-[11px] text-slate-400">hours logged</span>
      </div>
      <div className="space-y-2.5">
        {catData.slice(0, 7).map(cat => (
          <div key={cat.id} className="flex items-center gap-2.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cat.bg} ${cat.text} w-16 text-center shrink-0`}>{cat.label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-[#f4f0e8] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(cat.hours / maxHours) * 100}%`, backgroundColor: cat.bar }} />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 w-10 text-right shrink-0">{cat.hours}h</span>
            <span className="text-[10px] text-slate-400 w-8 shrink-0">{cat.count}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Weekly bar chart component ──────────────────────────────────────────────
function WeeklyChart({ entries }: { entries: ProgressEntry[] }) {
  const weeks = useMemo(() => buildWeeklyChart(entries), [entries]);
  const maxH = Math.max(...weeks.map(w => w.hours), 1);
  const total = Math.round(weeks.reduce((s, w) => s + w.hours, 0) * 10) / 10;

  return (
    <div className="bg-white border border-[#e4ddd2] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-emerald-600" />
        <h2 className="text-[14px] font-semibold text-slate-800">Weekly Hours</h2>
        <span className="ml-auto text-[11px] text-slate-400">{total}h last 8 wks</span>
      </div>
      <div className="flex items-end gap-1.5 h-24 pt-3">
        {weeks.map((w, i) => {
          const heightPct = maxH > 0 ? (w.hours / maxH) * 100 : 0;
          const isThisWeek = i === weeks.length - 1;
          return (
            <TooltipProvider key={i} delayDuration={50}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex flex-col items-center gap-1 cursor-default">
                    <div className="w-full rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(heightPct, 2)}%`, backgroundColor: isThisWeek ? "#10b981" : "#d1fae5" }} />
                    <span className="text-[9px] text-slate-400 leading-none whitespace-nowrap">{w.label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-[12px]">
                    <div className="font-semibold">{w.label}</div>
                    <div className="text-muted-foreground">{w.hours > 0 ? `${w.hours}h logged` : "No activity"}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

function ProgressPageInner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const { data: entries = [], isLoading } = useQuery<ProgressEntry[]>({ queryKey: ["progress"], queryFn: () => api<ProgressEntry[]>("/progress") });
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });

  const createEntry = useMutation({
    mutationFn: (data: object) => api("/progress", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["progress"] }); queryClient.invalidateQueries({ queryKey: ["activity"] }); closeDialog(); toast({ title: "Progress logged ✓" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateEntry = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => api(`/progress/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["progress"] }); closeDialog(); toast({ title: "Updated ✓" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteEntry = useMutation({
    mutationFn: (id: number) => api(`/progress/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["progress"] }); toast({ title: "Deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeDialog = () => { setOpen(false); setEditingId(null); setForm(emptyForm()); };
  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setOpen(true); };
  const openEdit = (entry: ProgressEntry) => {
    setForm({ title: entry.title, category: entry.category, description: entry.description ?? "", status: entry.status, toolOrResource: entry.toolOrResource ?? "", resourceUrl: entry.resourceUrl ?? "", durationHours: String(entry.durationHours ?? 0), startDate: entry.startDate ? entry.startDate.slice(0, 10) : "", completedAt: entry.completedAt ? entry.completedAt.slice(0, 10) : "", goalId: entry.goalId ? String(entry.goalId) : "" });
    setEditingId(entry.id); setOpen(true);
  };
  const toggleCard = (id: number) => setExpandedCards(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const submit = () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const payload = { title: form.title.trim(), category: form.category, description: form.description.trim() || null, status: form.status, toolOrResource: form.toolOrResource.trim() || null, resourceUrl: form.resourceUrl.trim() || "", durationHours: form.durationHours, startDate: form.startDate || null, completedAt: form.completedAt || null, goalId: form.goalId ? Number(form.goalId) : null };
    if (editingId) updateEntry.mutate({ id: editingId, data: payload });
    else createEntry.mutate(payload);
  };

  const STATUS_SORT: Record<string, number> = { in_progress: 0, not_started: 1, completed: 2 };
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = entries;
    if (activeFilter === "all") { /* all */ }
    else if (["in_progress", "completed", "not_started"].includes(activeFilter)) base = entries.filter(e => e.status === activeFilter);
    else base = entries.filter(e => e.category === activeFilter);
    if (q) base = base.filter(e => [e.title, e.description, e.toolOrResource, e.category].filter(Boolean).join(" ").toLowerCase().includes(q));
    return [...base].sort((a, b) => (STATUS_SORT[a.status] ?? 1) - (STATUS_SORT[b.status] ?? 1));
  }, [entries, activeFilter, search]);

  const stats = useMemo(() => computeStats(entries), [entries]);
  const heatmap = useMemo(() => buildHeatmap(entries), [entries]);

  return (
    <div className="space-y-5 page-enter pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-slate-800 leading-tight">Learning</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Every hour logged compounds over time.</p>
        </div>
        <Dialog open={open} onOpenChange={v => v ? openCreate() : closeDialog()}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 text-[13px] shrink-0"><Plus className="h-3.5 w-3.5" />Log Progress</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl p-8">
            <DialogHeader className="mb-1">
              <DialogTitle className="text-[20px]">{editingId ? "Edit entry" : "Log new progress"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-muted-foreground">Title *</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Advanced SQL for Data Science" className="bg-secondary border-border text-[14px] h-11" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-muted-foreground">Category</label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="bg-secondary border-border text-[13px] h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-muted-foreground">Status</label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ProgressEntry["status"] }))}>
                    <SelectTrigger className="bg-secondary border-border text-[13px] h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-muted-foreground">Link to Goal (optional)</label>
                <Select value={form.goalId} onValueChange={v => setForm(f => ({ ...f, goalId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="bg-secondary border-border text-[13px] h-11"><SelectValue placeholder="Select a parent goal…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No goal</SelectItem>
                    {goals.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.targetRole} — {g.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-muted-foreground">Hours</label>
                  <Input type="number" min={0} step="0.25" value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))} className="bg-secondary border-border text-[13px] h-11" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-muted-foreground">Start date</label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-secondary border-border text-[13px] h-11" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-muted-foreground">Completed on</label>
                  <Input type="date" value={form.completedAt} onChange={e => setForm(f => ({ ...f, completedAt: e.target.value }))} className="bg-secondary border-border text-[13px] h-11" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-muted-foreground">Resource URL</label>
                <Input value={form.resourceUrl} onChange={e => setForm(f => ({ ...f, resourceUrl: e.target.value }))} placeholder="https://..." className="bg-secondary border-border text-[13px] h-11" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-muted-foreground">Resource name (optional)</label>
                <Input value={form.toolOrResource} onChange={e => setForm(f => ({ ...f, toolOrResource: e.target.value }))} placeholder="e.g. Coursera, TensorFlow" className="bg-secondary border-border text-[13px] h-11" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-muted-foreground">Notes</label>
                  <span className={`text-[11px] ${form.description.length > MAX_NOTES * 0.9 ? "text-amber-500" : "text-muted-foreground"}`}>{form.description.length}/{MAX_NOTES}</span>
                </div>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, MAX_NOTES) }))} placeholder="What did you learn? Key takeaways, blockers, next steps…" className="resize-y bg-secondary border-border text-[13px] min-h-[100px]" rows={4} />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={closeDialog} className="text-[13px]">Cancel</Button>
              <Button onClick={submit} disabled={createEntry.isPending || updateEntry.isPending} className="text-[13px]">
                {(createEntry.isPending || updateEntry.isPending) ? "Saving…" : "Save entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total hours", value: `${stats.totalHours}h`, icon: Clock, accent: "text-sky-600 bg-sky-50", border: "border-sky-100" },
          { label: "This week",   value: `${stats.hoursThisWeek}h`, icon: TrendingUp, accent: "text-emerald-600 bg-emerald-50", border: "border-emerald-100" },
          { label: "Day streak",  value: `${stats.streak}d`, icon: Flame, accent: "text-orange-600 bg-orange-50", border: "border-orange-100" },
          { label: "Completed",   value: `${stats.completed}`, icon: CheckCircle2, accent: "text-violet-600 bg-violet-50", border: "border-violet-100" },
        ].map(({ label, value, icon: Icon, accent, border }) => (
          <div key={label} className={`bg-white border ${border} rounded-2xl px-4 py-3.5 shadow-sm`}>
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${accent} mb-2`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-[26px] font-bold text-slate-800 leading-tight mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WeeklyChart entries={entries} />
          <CategoryBreakdown entries={entries} />
        </div>
      )}

      {/* Completion progress bar */}
      {entries.length > 0 && (
        <div className="bg-white border border-[#e4ddd2] rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <span className="text-[13px] font-semibold text-slate-800">Completion Rate</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span><span className="font-bold text-amber-600">{stats.inProgress}</span> in progress</span>
              <span><span className="font-bold text-emerald-600">{stats.completed}</span> done</span>
              <span className="font-bold text-slate-700">{stats.completionRate}%</span>
            </div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#f4f0e8] overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${stats.completionRate}%` }} />
          </div>
        </div>
      )}

      {/* Heatmap */}
      {entries.length > 0 && (
        <div className="bg-white border border-[#e4ddd2] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-slate-800">Daily Activity</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">12 weeks of logged hours</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>Less</span>
              {["bg-slate-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"].map((c, i) => <span key={i} className={`h-3 w-3 rounded-sm ${c}`} />)}
              <span>More</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={50}>
              <div className="flex gap-1 min-w-max">
                {heatmap.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map(day => (
                      <Tooltip key={day.key}>
                        <TooltipTrigger asChild>
                          <div className={`h-3 w-3 rounded-sm cursor-default ${heatmapColor(day.hours, day.isFuture)}`} />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="text-[12px]">
                            <div className="font-semibold">{format(day.date, "MMM d, yyyy")}</div>
                            <div className="text-muted-foreground">{day.hours > 0 ? `${day.hours.toFixed(1)}h logged` : "No activity"}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, notes, category…" className="pl-10 h-10 text-[13px] rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-1 text-[12px] font-semibold rounded-full transition-colors ${activeFilter === tab.id ? "bg-emerald-600 text-white shadow-sm" : "bg-[#f4f0e8] text-slate-600 hover:bg-[#e8e2d8]"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!isLoading && entries.length > 0 && (
        <p className="text-[12px] text-muted-foreground -mt-1">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}{search ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* Entry cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((entry, index) => {
            const cat = categoryMeta(entry.category);
            const statusMeta = STATUS_META[entry.status] ?? STATUS_META.in_progress;
            const isExpanded = expandedCards.has(entry.id);
            const notesLong = (entry.description?.length ?? 0) > 100;
            const linkedGoal = entry.goalId ? goals.find(g => g.id === entry.goalId) : null;
            let daysTaken: number | null = null;
            if (entry.startDate && entry.completedAt) {
              daysTaken = differenceInDays(new Date(entry.completedAt), new Date(entry.startDate));
            } else if (entry.startDate && entry.status !== "completed") {
              daysTaken = differenceInDays(new Date(), new Date(entry.startDate));
            }
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.25) }}>
                <div className="group bg-white border border-[#e4ddd2] rounded-2xl p-4 flex flex-col h-full hover:border-emerald-200 hover:shadow-md transition-all shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>{cat.label}</span>
                      {entry.durationHours > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" />{entry.durationHours}h
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusMeta.bg} ${statusMeta.text}`}>{statusMeta.label}</span>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {entry.resourceUrl && (
                        <a href={entry.resourceUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>
                      )}
                      <button onClick={() => openEdit(entry)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm("Delete this entry?")) deleteEntry.mutate(entry.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <h3 className="text-[14px] font-semibold text-slate-800 leading-snug mb-1">{entry.title}</h3>
                  {entry.toolOrResource && <p className="text-[11px] text-slate-400 mb-2">{entry.toolOrResource}</p>}
                  {linkedGoal && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">{linkedGoal.targetRole}</span>
                    </div>
                  )}
                  {entry.description && (
                    <div className="mb-2">
                      <p className={`text-[12px] text-slate-500 leading-relaxed ${!isExpanded && notesLong ? "line-clamp-2" : ""}`}>{entry.description}</p>
                      {notesLong && (
                        <button onClick={() => toggleCard(entry.id)} className="flex items-center gap-1 text-[11px] text-emerald-600 hover:underline mt-0.5">
                          {isExpanded ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />More</>}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="mt-auto pt-2 border-t border-[#f0ebe0] flex items-center gap-2 text-[10px] text-slate-400">
                    {daysTaken !== null && (
                      <span>{entry.status === "completed" ? `Done in ${daysTaken}d` : `${daysTaken}d ongoing`}</span>
                    )}
                    <span className="ml-auto">{format(new Date(entry.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[#e4ddd2] rounded-2xl">
          <BookOpen className="h-10 w-10 text-slate-200 mb-3" />
          <p className="text-[15px] font-medium text-slate-700 mb-1">No learning logged yet</p>
          <p className="text-[13px] text-muted-foreground mb-5 max-w-xs">Track courses, books, projects, and practice sessions.</p>
          <Button onClick={openCreate} size="sm" className="gap-1.5 text-[13px]"><Plus className="h-3.5 w-3.5" />Log first entry</Button>
        </div>
      ) : (
        <div className="text-center py-10 text-[13px] text-muted-foreground">No entries match this filter.</div>
      )}
    </div>
  );
}

export default function ProgressPage() {
  return <PageErrorBoundary message="Could not load learning entries — please refresh"><ProgressPageInner /></PageErrorBoundary>;
}
