import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Microscope, Plus, ExternalLink, Pencil, Trash2, Search, FileText, BookOpen,
  GraduationCap, Database, Lightbulb, StickyNote, Library, Github, Calendar,
  ChevronDown, ChevronUp, Link2,
} from "lucide-react";
import { format } from "date-fns";

type ResearchStatus = "to_explore" | "reading" | "working" | "completed";
type ResearchType = "paper" | "article" | "book" | "dataset" | "thesis" | "topic" | "note";

type ResearchItem = {
  id: number; title: string; type: ResearchType; authors: string | null;
  source: string | null; summary: string | null; tags: string[];
  status: ResearchStatus; notes: string | null; goalId: number | null;
  createdAt: string; updatedAt: string;
};

type ResearchFormState = {
  title: string; type: ResearchType; authors: string; source: string;
  summary: string; tagsText: string; status: ResearchStatus; notes: string;
  deadline: string;
};

const EMPTY_FORM: ResearchFormState = {
  title: "", type: "paper", authors: "", source: "",
  summary: "", tagsText: "", status: "to_explore", notes: "", deadline: "",
};

const TYPE_META: Record<ResearchType, { label: string; Icon: React.ElementType; color: string }> = {
  paper:   { label: "Paper",   Icon: FileText,     color: "bg-sky-100 text-sky-700" },
  article: { label: "Article", Icon: Library,      color: "bg-indigo-100 text-indigo-700" },
  book:    { label: "Book",    Icon: BookOpen,     color: "bg-amber-100 text-amber-700" },
  dataset: { label: "Dataset", Icon: Database,     color: "bg-violet-100 text-violet-700" },
  thesis:  { label: "Thesis",  Icon: GraduationCap, color: "bg-rose-100 text-rose-700" },
  topic:   { label: "Topic",   Icon: Lightbulb,    color: "bg-orange-100 text-orange-700" },
  note:    { label: "Note",    Icon: StickyNote,   color: "bg-teal-100 text-teal-700" },
};

const STATUS_META: Record<ResearchStatus, { label: string; chip: string }> = {
  to_explore: { label: "To explore", chip: "bg-amber-100 text-amber-800" },
  reading:    { label: "Reading",    chip: "bg-sky-100 text-sky-800" },
  working:    { label: "Working",    chip: "bg-violet-100 text-violet-800" },
  completed:  { label: "Completed",  chip: "bg-emerald-100 text-emerald-800" },
};

const DEADLINE_PREFIX = "📅 Deadline: ";

function extractDeadline(notes: string | null): { deadline: string; cleanNotes: string } {
  if (!notes) return { deadline: "", cleanNotes: "" };
  const lines = notes.split("\n");
  const deadlineIdx = lines.findIndex(l => l.startsWith(DEADLINE_PREFIX));
  if (deadlineIdx === -1) return { deadline: "", cleanNotes: notes };
  const deadline = lines[deadlineIdx].replace(DEADLINE_PREFIX, "").trim();
  const cleanNotes = lines.filter((_, i) => i !== deadlineIdx).join("\n").trimStart();
  return { deadline, cleanNotes };
}

function buildNotes(deadline: string, notes: string): string | null {
  const parts: string[] = [];
  if (deadline) parts.push(`${DEADLINE_PREFIX}${deadline}`);
  if (notes.trim()) parts.push(notes.trim());
  return parts.length ? parts.join("\n") : null;
}

function toForm(item: ResearchItem): ResearchFormState {
  const { deadline, cleanNotes } = extractDeadline(item.notes);
  return {
    title: item.title, type: item.type, authors: item.authors ?? "", source: item.source ?? "",
    summary: item.summary ?? "", tagsText: item.tags.join(", "), status: item.status,
    notes: cleanNotes, deadline,
  };
}

function payloadFromForm(form: ResearchFormState) {
  return {
    title: form.title.trim(), type: form.type, authors: form.authors.trim() || null,
    source: form.source.trim() || null, summary: form.summary.trim() || null,
    tags: form.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    status: form.status,
    notes: buildNotes(form.deadline, form.notes),
  };
}

function renderBullets(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletGroup: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletGroup.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="list-disc list-inside space-y-0.5 text-muted-foreground">
          {bulletGroup.map((b, i) => <li key={i} className="text-[13.5px] leading-relaxed">{b}</li>)}
        </ul>
      );
      bulletGroup = [];
    }
  };

  lines.forEach((line, i) => {
    const stripped = line.trimStart();
    if (stripped.startsWith("- ") || stripped.startsWith("• ") || stripped.startsWith("* ")) {
      bulletGroup.push(stripped.slice(2).trimStart());
    } else {
      flushBullets(String(i));
      if (stripped) elements.push(<p key={i} className="text-[13.5px] text-muted-foreground leading-relaxed">{stripped}</p>);
    }
  });
  flushBullets("end");
  return <div className="space-y-1">{elements}</div>;
}

type AcademicProfiles = {
  github: string; researchgate: string; kaggle: string; scholar: string;
};

const EMPTY_PROFILES: AcademicProfiles = { github: "", researchgate: "", kaggle: "", scholar: "" };

function useAcademicProfiles() {
  const key = "atlas_academic_profiles";
  const load = (): AcademicProfiles => {
    try { return { ...EMPTY_PROFILES, ...JSON.parse(localStorage.getItem(key) ?? "{}") }; }
    catch { return { ...EMPTY_PROFILES }; }
  };
  const [profiles, setProfilesState] = useState<AcademicProfiles>(load);
  const save = (p: AcademicProfiles) => {
    localStorage.setItem(key, JSON.stringify(p));
    setProfilesState(p);
  };
  return { profiles, save };
}

export default function ResearchPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profiles, save: saveProfiles } = useAcademicProfiles();
  const [showProfilesPanel, setShowProfilesPanel] = useState(false);
  const [profileDraft, setProfileDraft] = useState<AcademicProfiles>(profiles);

  const { data: items, isLoading } = useQuery({ queryKey: ["research"], queryFn: () => api<ResearchItem[]>("/research") });

  const createMut = useMutation({
    mutationFn: (form: ResearchFormState) => api<ResearchItem>("/research", { method: "POST", body: JSON.stringify(payloadFromForm(form)) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["research"] }); qc.invalidateQueries({ queryKey: ["activity"] }); toast({ title: "Research item added" }); closeDialog(); },
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, form }: { id: number; form: ResearchFormState }) => api<ResearchItem>(`/research/${id}`, { method: "PUT", body: JSON.stringify(payloadFromForm(form)) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["research"] }); toast({ title: "Updated" }); closeDialog(); },
    onError: (e: Error) => toast({ title: "Couldn't update", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api<void>(`/research/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["research"] }); toast({ title: "Deleted" }); },
    onError: (e: Error) => toast({ title: "Couldn't delete", description: e.message, variant: "destructive" }),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResearchItem | null>(null);
  const [form, setForm] = useState<ResearchFormState>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState<"all" | ResearchStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ResearchType>("all");
  const [search, setSearch] = useState("");

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); }
  function openEdit(item: ResearchItem) { setEditing(item); setForm(toForm(item)); setDialogOpen(true); }
  function closeDialog() { setDialogOpen(false); setTimeout(() => { setEditing(null); setForm(EMPTY_FORM); }, 150); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (editing) updateMut.mutate({ id: editing.id, form });
    else createMut.mutate(form);
  }

  const filtered = useMemo(() => {
    const list = items ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (!q) return true;
      return [i.title, i.authors, i.summary, i.notes, i.tags.join(" ")].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [items, statusFilter, typeFilter, search]);

  const stats = useMemo(() => {
    const list = items ?? [];
    return {
      total: list.length,
      toExplore: list.filter((i) => i.status === "to_explore").length,
      reading: list.filter((i) => i.status === "reading").length,
      working: list.filter((i) => i.status === "working").length,
      completed: list.filter((i) => i.status === "completed").length,
    };
  }, [items]);

  const hasAnyProfile = Object.values(profiles).some(v => v.trim());

  return (
    <div className="page-enter space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-400 shadow-md shrink-0">
            <Microscope className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[28px] sm:text-[30px] font-bold text-foreground tracking-tight">Research</h1>
            <p className="text-[14px] text-muted-foreground mt-0.5">Capture papers, articles, and ideas — and tie them to your goals.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => { setProfileDraft(profiles); setShowProfilesPanel(v => !v); }} className="gap-1.5 text-[13px]">
            <Link2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Profiles</span>
            {showProfilesPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="shrink-0 h-10 text-[14px]">
                <Plus className="h-4 w-4" /><span className="hidden sm:inline">Add item</span><span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <ResearchDialog form={form} setForm={setForm} onSubmit={submit} editing={!!editing} saving={createMut.isPending || updateMut.isPending} />
          </Dialog>
        </div>
      </div>

      {/* Academic profiles panel */}
      {showProfilesPanel && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[15px] font-semibold text-foreground">Academic & Social Profiles</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "github" as const, label: "GitHub", placeholder: "https://github.com/username" },
              { key: "researchgate" as const, label: "ResearchGate", placeholder: "https://www.researchgate.net/profile/…" },
              { key: "kaggle" as const, label: "Kaggle", placeholder: "https://www.kaggle.com/username" },
              { key: "scholar" as const, label: "Google Scholar", placeholder: "https://scholar.google.com/citations?user=…" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label className="text-[12px] font-semibold text-muted-foreground">{label}</Label>
                <Input
                  value={profileDraft[key]}
                  onChange={(e) => setProfileDraft(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="h-10 text-[13px]"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="text-[13px]" onClick={() => setShowProfilesPanel(false)}>Cancel</Button>
            <Button size="sm" className="text-[13px]" onClick={() => { saveProfiles(profileDraft); setShowProfilesPanel(false); toast({ title: "Profiles saved" }); }}>Save</Button>
          </div>
          {hasAnyProfile && (
            <div className="pt-2 border-t border-border flex flex-wrap gap-2">
              {profiles.github && <a href={profiles.github} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"><Github className="h-3.5 w-3.5" />GitHub</a>}
              {profiles.researchgate && <a href={profiles.researchgate} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"><ExternalLink className="h-3.5 w-3.5" />ResearchGate</a>}
              {profiles.kaggle && <a href={profiles.kaggle} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"><ExternalLink className="h-3.5 w-3.5" />Kaggle</a>}
              {profiles.scholar && <a href={profiles.scholar} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"><ExternalLink className="h-3.5 w-3.5" />Google Scholar</a>}
            </div>
          )}
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatTile label="Total"      value={stats.total}     />
        <StatTile label="To explore" value={stats.toExplore} />
        <StatTile label="Reading"    value={stats.reading}   />
        <StatTile label="Working"    value={stats.working}   highlight />
        <StatTile label="Completed"  value={stats.completed} />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, authors, tags…" className="pl-10 h-11 text-[14px] rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</Chip>
          {(Object.keys(STATUS_META) as ResearchStatus[]).map((s) => (
            <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{STATUS_META[s].label}</Chip>
          ))}
          <span className="mx-1 self-center w-px h-5 bg-border" />
          <Chip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>Any type</Chip>
          {(Object.keys(TYPE_META) as ResearchType[]).map((t) => (
            <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>{TYPE_META[t].label}</Chip>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={openCreate} hasItems={(items?.length ?? 0) > 0} />
        ) : (
          filtered.map((item) => (
            <ResearchCard key={item.id} item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => { if (confirm(`Delete "${item.title}"?`)) deleteMut.mutate(item.id); }} />
          ))
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${highlight ? "border-violet-200 bg-violet-50" : "border-border bg-card"}`}>
      <div className={`text-[11px] uppercase tracking-wider font-semibold ${highlight ? "text-violet-600" : "text-muted-foreground"}`}>{label}</div>
      <div className={`text-[26px] font-bold mt-0.5 leading-none ${highlight ? "text-violet-700" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"}`}>
      {children}
    </button>
  );
}

function ResearchCard({ item, onEdit, onDelete }: { item: ResearchItem; onEdit: () => void; onDelete: () => void }) {
  const TypeIcon = TYPE_META[item.type].Icon;
  const status = STATUS_META[item.status];
  const typeMeta = TYPE_META[item.type];
  const { deadline, cleanNotes } = extractDeadline(item.notes);

  const now = new Date(); now.setHours(0, 0, 0, 0);
  let daysLeft: number | null = null;
  if (deadline) {
    const d = new Date(deadline); d.setHours(0, 0, 0, 0);
    daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-150 border-border">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.color}`}>
              <TypeIcon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-[15px] font-semibold leading-snug break-words">{item.title}</CardTitle>
              <div className="text-[12px] text-muted-foreground mt-0.5 truncate">{item.authors || TYPE_META[item.type].label}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {item.source && (
              <a href={item.source} target="_blank" rel="noreferrer noopener" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Open source">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button onClick={onEdit} aria-label="Edit" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="h-4 w-4" /></button>
            <button onClick={onDelete} aria-label="Delete" className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-5 pb-4">
        {item.summary && (
          <div className="mb-3">
            {renderBullets(item.summary)}
          </div>
        )}
        {cleanNotes && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            {renderBullets(cleanNotes)}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${status.chip}`}>{status.label}</span>
          {deadline && daysLeft !== null && (
            <span className={`flex items-center gap-1 text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${daysLeft < 0 ? "bg-red-100 text-red-700" : daysLeft <= 7 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
              <Calendar className="h-3 w-3" />
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
            </span>
          )}
          {item.tags.slice(0, 6).map((tag) => <Badge key={tag} variant="secondary" className="text-[11px] font-medium">{tag}</Badge>)}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onAdd, hasItems }: { onAdd: () => void; hasItems: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-400 shadow-md flex items-center justify-center mb-4">
        <Microscope className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-[17px] font-semibold text-foreground">{hasItems ? "Nothing matches those filters" : "Start your research library"}</h3>
      <p className="text-[14px] text-muted-foreground mt-1.5 max-w-xs">
        {hasItems ? "Try clearing the search or pick a different status." : "Save papers, articles, books, datasets, and ideas — and link them to a goal."}
      </p>
      {!hasItems && <Button onClick={onAdd} className="mt-5 gap-2"><Plus className="h-4 w-4" />Add your first item</Button>}
    </div>
  );
}

function ResearchDialog({ form, setForm, onSubmit, editing, saving }: {
  form: ResearchFormState; setForm: (f: ResearchFormState) => void;
  onSubmit: (e: React.FormEvent) => void; editing: boolean; saving: boolean;
}) {
  return (
    <DialogContent className="sm:max-w-lg max-h-[92dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-[18px]">{editing ? "Edit research item" : "Add research item"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="r-title" className="text-[13px] font-semibold">Title *</Label>
          <Input id="r-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Attention Is All You Need" required autoFocus className="h-11" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ResearchType })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(TYPE_META) as ResearchType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ResearchStatus })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as ResearchStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-deadline" className="text-[13px] font-semibold flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />Deadline (optional)
          </Label>
          <Input id="r-deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-authors" className="text-[13px] font-semibold">Authors</Label>
          <Input id="r-authors" value={form.authors} onChange={(e) => setForm({ ...form, authors: e.target.value })} placeholder="Vaswani et al." className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-source" className="text-[13px] font-semibold">Source URL</Label>
          <Input id="r-source" type="url" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="https://arxiv.org/abs/…" className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-summary" className="text-[13px] font-semibold">
            Description / Summary
            <span className="ml-1 text-muted-foreground font-normal text-[12px]">(supports bullet points: start lines with "- ")</span>
          </Label>
          <Textarea id="r-summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder={"What's it about?\n- Key finding one\n- Key finding two"} rows={4} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-tags" className="text-[13px] font-semibold">Tags <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
          <Input id="r-tags" value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} placeholder="ml, transformers, nlp" className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-notes" className="text-[13px] font-semibold">
            Personal Notes
            <span className="ml-1 text-muted-foreground font-normal text-[12px]">(supports "- " bullet points)</span>
          </Label>
          <Textarea id="r-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={"Takeaways and follow-ups:\n- Interesting finding\n- Compare with paper X"} rows={3} />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="submit" disabled={saving} className="h-11 sm:h-10 text-[14px]">{saving ? "Saving…" : editing ? "Save changes" : "Add to library"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
