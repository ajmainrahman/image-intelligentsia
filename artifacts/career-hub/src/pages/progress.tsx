import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
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
  { id: "course",        label: "Course",        bg: "bg-accent",      text: "text-primary" },
  { id: "project",       label: "Project",       bg: "bg-secondary",   text: "text-foreground" },
  { id: "certification", label: "Certification", bg: "bg-amber-50",    text: "text-amber-700" },
  { id: "ai_tool",       label: "AI Tool",       bg: "bg-secondary",   text: "text-foreground" },
  { id: "book",          label: "Book",          bg: "bg-emerald-50",  text: "text-emerald-700" },
  { id: "practice",      label: "Practice",      bg: "bg-secondary",   text: "text-foreground" },
  { id: "tool",          label: "Tool",          bg: "bg-accent",      text: "text-primary" },
  { id: "reading",       label: "Reading",       bg: "bg-accent",      text: "text-primary" },
  { id: "other",         label: "Other",         bg: "bg-secondary",   text: "text-muted-foreground" },
] as const;

const FILTER_TABS = [
  { id: "all",           label: "All" },
  { id: "course",        label: "Course" },
  { id: "project",       label: "Project" },
  { id: "certification", label: "Certification" },
  { id: "ai_tool",       label: "AI Tool" },
  { id: "book",          label: "Book" },
  { id: "practice",      label: "Practice" },
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
      week.push({ date, iso, hours: totals.get(startOfDay(date).toISOString()) ?? 0, isFuture: date > today });
    }
    weeks.push(week);
  }
  return weeks;
}

function heatmapColor(hours: number, isFuture: boolean) {
  if (isFuture) return "bg-transparent border border-dashed border-border/30";
  if (hours <= 0) return "bg-secondary";
  if (hours < 3) return "bg-primary/20";
  if (hours < 6) return "bg-primary/50";
  return "bg-primary";
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

const serif = { fontFamily: "'DM Serif Display', serif", fontWeight: 400 };

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
      title: entry.title, category: entry.category,
      description: entry.description ?? "", status: entry.status,
      toolOrResource: entry.toolOrResource ?? "", resourceUrl: entry.resourceUrl ?? "",
      durationHours: String(entry.durationHours ?? 0),
      completedAt: entry.completedAt ? entry.completedAt.slice(0, 10) : "",
    });
    setEditingId(entry.id);
    setOpen(true);
  };

  const submit = () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const payload = {
      title: form.title.trim(), category: form.category,
      description: form.description.trim() || null, status: form.status,
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

  return (
    <div className="space-y-10 page-enter">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] text-foreground leading-tight" style={serif}>
            How you're growing
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1.5">
            Every hour logged compounds over time.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => (v ? openCreate() : closeDialog())}>
          <DialogTrigger asChild>
            <Button className="gap-2 text-[13px]">
              <Plus className="h-3.5 w-3.5" />
              Log Progress
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] rounded-2xl p-8">
            <DialogHeader className="mb-1">
              <DialogTitle className="text-[20px]" style={serif}>
                {editingId ? "Edit entry" : "Log new progress"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Title</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Advanced SQL for Data Science"
                  className="bg-secondary border-border text-[13px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Category</label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger className="bg-secondary border-border text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Status</label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProgressEntry["status"] }))}>
                    <SelectTrigger className="bg-secondary border-border text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Duration (hours)</label>
                  <Input
                    type="number" min={0} step="0.25" value={form.durationHours}
                    onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))}
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Completed on</label>
                  <Input
                    type="date" value={form.completedAt}
                    onChange={(e) => setForm((f) => ({ ...f, completedAt: e.target.value }))}
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Resource URL</label>
                <Input
                  value={form.resourceUrl}
                  onChange={(e) => setForm((f) => ({ ...f, resourceUrl: e.target.value }))}
                  placeholder="https://..."
                  className="bg-secondary border-border text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Resource name (optional)</label>
                <Input
                  value={form.toolOrResource}
                  onChange={(e) => setForm((f) => ({ ...f, toolOrResource: e.target.value }))}
                  placeholder="e.g. Coursera, TensorFlow"
                  className="bg-secondary border-border text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Notes</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="resize-none bg-secondary border-border text-[13px]"
                  rows={3}
                />
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
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Total hours logged",  value: `${stats.totalHours} hr` },
          { label: "Entries this week",   value: stats.entriesThisWeek },
          { label: "Current streak",      value: `${stats.streak} day${stats.streak === 1 ? "" : "s"}` },
          { label: "Most active",         value: stats.topCategoryLabel },
        ].map((stat) => (
          <div key={stat.label} className="bg-secondary rounded-xl px-5 py-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {stat.label}
            </p>
            <p className="text-[28px] text-foreground leading-none" style={serif}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] text-foreground" style={serif}>Last 12 weeks</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Daily learning activity</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Less</span>
            {["bg-secondary", "bg-primary/20", "bg-primary/50", "bg-primary"].map((c, i) => (
              <span key={i} className={`h-3 w-3 rounded-sm ${c}`} />
            ))}
            <span>More</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <TooltipProvider delayDuration={50}>
            <div className="flex gap-1 min-w-max">
              {heatmap.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day) => (
                    <Tooltip key={day.iso}>
                      <TooltipTrigger asChild>
                        <div className={`h-3 w-3 rounded-sm cursor-default ${heatmapColor(day.hours, day.isFuture)}`} />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="text-[11px]">
                          <div className="font-medium">{format(day.date, "MMM d, yyyy")}</div>
                          <div className="text-muted-foreground">{day.hours.toFixed(1)} hr</div>
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

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
              activeFilter === tab.id
                ? "bg-accent text-primary"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Entry cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((entry, index) => {
            const cat = categoryMeta(entry.category);
            const isCompleted = entry.status === "completed" || !!entry.completedAt;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3), ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="group bg-card border border-border rounded-2xl p-5 flex flex-col h-full hover:border-muted-foreground/30 transition-colors duration-150">

                  {/* Card top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>
                        {cat.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        {entry.durationHours.toFixed(entry.durationHours % 1 === 0 ? 0 : 1)} hr
                      </span>
                      {entry.resourceUrl && (
                        <a
                          href={entry.resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(entry)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this entry?")) deleteEntry.mutate(entry.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-[14px] font-medium text-foreground leading-snug line-clamp-2 mb-1">
                    {entry.title}
                  </h3>

                  {/* Resource name */}
                  {entry.toolOrResource && (
                    <p className="text-[11px] text-muted-foreground mb-2">{entry.toolOrResource}</p>
                  )}

                  {/* Notes */}
                  <p className="text-[13px] text-muted-foreground line-clamp-2 flex-1 mb-4">
                    {entry.description || "No notes yet."}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      isCompleted
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {isCompleted ? "Completed" : "In Progress"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(entry.completedAt ?? entry.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-2xl">
          <p className="text-[15px] font-medium text-foreground mb-1" style={serif}>
            No learning entries yet
          </p>
          <p className="text-[13px] text-muted-foreground mb-6 max-w-xs">
            Track courses, tools, and projects you're working on.
          </p>
          <Button onClick={openCreate} className="gap-2 text-[13px]">
            <Plus className="h-3.5 w-3.5" />
            Log your first entry
          </Button>
        </div>
      )}
    </div>
  );
}