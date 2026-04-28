import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Pencil, Trash2, ExternalLink, Clock3, Flame, Layers, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ProgressEntry = {
  id: number;
  title: string;
  category: string;
  description: string | null;
  status: "not_started" | "in_progress" | "completed";
  toolOrResource: string | null;
  resourceUrl: string | null;
  durationHours: number;
  completedAt: string | null;
  createdAt: string;
};

type FormState = {
  title: string;
  category: string;
  description: string;
  status: ProgressEntry["status"];
  toolOrResource: string;
  resourceUrl: string;
  durationHours: string;
  completedAt: string;
};

const CATEGORIES = [
  { id: "course",        label: "Course",        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { id: "project",       label: "Project",       color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  { id: "certification", label: "Certification", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { id: "ai_tool",       label: "AI Tool",       color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300" },
  { id: "book",          label: "Book",          color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  { id: "practice",      label: "Practice",      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  { id: "tool",          label: "Tool",          color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  { id: "reading",       label: "Reading",       color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  { id: "other",         label: "Other",         color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
] as const;

const FILTER_TABS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "course", label: "Course" },
  { id: "project", label: "Project" },
  { id: "certification", label: "Certification" },
  { id: "ai_tool", label: "AI Tool" },
  { id: "book", label: "Book" },
  { id: "practice", label: "Practice" },
];

const emptyForm = (): FormState => ({
  title: "", category: "course", description: "", status: "not_started",
  toolOrResource: "", resourceUrl: "", durationHours: "0", completedAt: "",
});

function categoryMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildHeatmap(entries: ProgressEntry[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const stamp = startOfDay(new Date(entry.createdAt)).toISOString();
    totals.set(stamp, (totals.get(stamp) ?? 0) + (entry.durationHours || 0));
  }

  const today = startOfDay(new Date());
  const dayOfWeek = today.getDay();
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - dayOfWeek);

  const weeks: { date: Date; iso: string; hours: number; isFuture: boolean }[][] = [];
  for (let w = 11; w >= 0; w--) {
    const week: { date: Date; iso: string; hours: number; isFuture: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(lastSunday);
      date.setDate(lastSunday.getDate() - w * 7 + d);
      const iso = date.toISOString();
      week.push({
        date,
        iso,
        hours: totals.get(startOfDay(date).toISOString()) ?? 0,
        isFuture: date > today,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

function heatmapColor(hours: number, isFuture: boolean) {
  if (isFuture) return "bg-transparent border border-dashed border-border/40";
  if (hours <= 0) return "bg-muted";
  if (hours < 3) return "bg-emerald-200 dark:bg-emerald-900/50";
  if (hours < 6) return "bg-emerald-400 dark:bg-emerald-700";
  return "bg-emerald-600 dark:bg-emerald-500";
}

function computeStats(entries: ProgressEntry[]) {
  const now = new Date();
  const startOfWeek = startOfDay(new Date(now));
  startOfWeek.setDate(startOfWeek.getDate() - now.getDay());

  const totalHours = entries.reduce((sum, e) => sum + (e.durationHours || 0), 0);
  const entriesThisWeek = entries.filter((e) => new Date(e.createdAt) >= startOfWeek).length;

  const days = new Set<string>();
  for (const e of entries) days.add(startOfDay(new Date(e.createdAt)).toISOString());
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const day = startOfDay(new Date(now));
    day.setDate(day.getDate() - i);
    if (days.has(day.toISOString())) streak += 1;
    else if (i === 0) continue;
    else break;
  }

  const categoryCounts = new Map<string, number>();
  for (const e of entries) categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
  let topCategory = "—";
  let topCount = 0;
  for (const [cat, count] of categoryCounts) {
    if (count > topCount) { topCategory = cat; topCount = count; }
  }

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    entriesThisWeek,
    streak,
    topCategoryLabel: topCategory === "—" ? "—" : categoryMeta(topCategory).label,
  };
}

export default function ProgressPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: entries = [], isLoading } = useQuery<ProgressEntry[]>({
    queryKey: ["progress"],
    queryFn: () => api<ProgressEntry[]>("/progress"),
  });

  const createEntry = useMutation({
    mutationFn: (data: object) => api("/progress", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      closeDialog();
      toast({ title: "Progress logged" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateEntry = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      api(`/progress/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      closeDialog();
      toast({ title: "Progress updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteEntry = useMutation({
    mutationFn: (id: number) => api(`/progress/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      toast({ title: "Entry deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeDialog = () => { setOpen(false); setEditingId(null); setForm(emptyForm()); };
  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setOpen(true); };

  const openEdit = (entry: ProgressEntry) => {
    setForm({
      title: entry.title,
      category: entry.category,
      description: entry.description ?? "",
      status: entry.status,
      toolOrResource: entry.toolOrResource ?? "",
      resourceUrl: entry.resourceUrl ?? "",
      durationHours: String(entry.durationHours ?? 0),
      completedAt: entry.completedAt ? entry.completedAt.slice(0, 10) : "",
    });
    setEditingId(entry.id);
    setOpen(true);
  };

  const submit = () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim() || null,
      status: form.status,
      toolOrResource: form.toolOrResource.trim() || null,
      resourceUrl: form.resourceUrl.trim() || null,
      durationHours: Number(form.durationHours) || 0,
      completedAt: form.completedAt ? new Date(form.completedAt).toISOString() : null,
    };
    if (editingId) updateEntry.mutate({ id: editingId, data: payload });
    else createEntry.mutate(payload);
  };

  const filtered = useMemo(() => {
    return activeFilter === "all" ? entries : entries.filter((e) => e.category === activeFilter);
  }, [entries, activeFilter]);

  const stats = useMemo(() => computeStats(entries), [entries]);
  const heatmap = useMemo(() => buildHeatmap(entries), [entries]);

  const STAT_CARDS = [
    { label: "Total hours logged", value: `${stats.totalHours} hr`, Icon: Clock3 },
    { label: "Entries this week",  value: stats.entriesThisWeek,    Icon: Calendar },
    { label: "Current streak",     value: `${stats.streak} day${stats.streak === 1 ? "" : "s"}`, Icon: Flame },
    { label: "Most active",        value: stats.topCategoryLabel,   Icon: Layers },
  ];

  return (
    <div className="space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Progress</h1>
          <p className="text-muted-foreground mt-1">Track courses, tools, and projects you are working on.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => (v ? openCreate() : closeDialog())}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Log Progress</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Progress" : "Log New Progress"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title</label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Advanced SQL for Data Science" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProgressEntry["status"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration (hours)</label>
                  <Input type="number" min={0} step="0.25" value={form.durationHours}
                    onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Completed on</label>
                  <Input type="date" value={form.completedAt}
                    onChange={(e) => setForm((f) => ({ ...f, completedAt: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Resource URL</label>
                <Input value={form.resourceUrl} onChange={(e) => setForm((f) => ({ ...f, resourceUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Resource name (optional)</label>
                <Input value={form.toolOrResource} onChange={(e) => setForm((f) => ({ ...f, toolOrResource: e.target.value }))} placeholder="e.g. Coursera, TensorFlow" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="resize-none" rows={3} />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button onClick={submit} disabled={createEntry.isPending || updateEntry.isPending}>
                {(createEntry.isPending || updateEntry.isPending) ? "Saving..." : "Save Progress"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.label} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Last 12 weeks</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Daily learning activity</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              {["bg-muted", "bg-emerald-200 dark:bg-emerald-900/50", "bg-emerald-400 dark:bg-emerald-700", "bg-emerald-600 dark:bg-emerald-500"].map((c) => (
                <span key={c} className={`h-3 w-3 rounded-sm ${c}`} />
              ))}
              <span>More</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <TooltipProvider delayDuration={50}>
            <div className="flex gap-1.5 min-w-max">
              {heatmap.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1.5">
                  {week.map((day) => (
                    <Tooltip key={day.iso}>
                      <TooltipTrigger asChild>
                        <div className={`h-3.5 w-3.5 rounded-sm ${heatmapColor(day.hours, day.isFuture)}`} />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="text-xs">
                          <div className="font-medium">{format(day.date, "MMM d, yyyy")}</div>
                          <div className="text-muted-foreground">{day.hours.toFixed(1)} hr logged</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/70 text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((entry, index) => {
            const cat = categoryMeta(entry.category);
            const isCompleted = entry.status === "completed" || !!entry.completedAt;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}
              >
                <Card className="flex flex-col h-full hover-elevate group transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`border-none ${cat.color}`}>{cat.label}</Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Clock3 className="h-3 w-3" />
                          {entry.durationHours.toFixed(entry.durationHours % 1 === 0 ? 0 : 1)} hr
                        </Badge>
                        {entry.resourceUrl && (
                          <a
                            href={entry.resourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-muted-foreground hover:text-primary"
                            aria-label="Open resource"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity -mr-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this entry?")) deleteEntry.mutate(entry.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg leading-snug line-clamp-2 mt-2">{entry.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    {entry.toolOrResource && (
                      <div className="text-xs text-muted-foreground font-medium">{entry.toolOrResource}</div>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {entry.description || "No notes yet."}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}>
                        {isCompleted ? "Completed" : "In Progress"}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(entry.completedAt ?? entry.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/10">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"><BookOpen className="h-8 w-8" /></div>
          <h3 className="text-xl font-semibold mb-2">No learning progress logged</h3>
          <p className="text-muted-foreground max-w-md mb-6">Track courses, tools, and projects you're working on.</p>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Log Your First Entry</Button>
        </div>
      )}
    </div>
  );
}
