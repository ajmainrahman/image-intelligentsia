import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import {
  Microscope, Plus, ExternalLink, Pencil, Trash2, Search, FileText, BookOpen,
  GraduationCap, Database, Lightbulb, StickyNote, Library, Github, Calendar,
  Link2, ChevronDown, ChevronUp, ArrowRight, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

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

const TYPE_META: Record<ResearchType, { label: string; Icon: React.ElementType; color: string; bar: string }> = {
  paper:   { label: "Paper",   Icon: FileText,      color: "bg-sky-100 text-sky-700",       bar: "#38bdf8" },
  article: { label: "Article", Icon: Library,       color: "bg-indigo-100 text-indigo-700", bar: "#818cf8" },
  book:    { label: "Book",    Icon: BookOpen,      color: "bg-amber-100 text-amber-700",   bar: "#fbbf24" },
  dataset: { label: "Dataset", Icon: Database,      color: "bg-violet-100 text-violet-700", bar: "#a78bfa" },
  thesis:  { label: "Thesis",  Icon: GraduationCap, color: "bg-rose-100 text-rose-700",    bar: "#fb7185" },
  topic:   { label: "Topic",   Icon: Lightbulb,     color: "bg-orange-100 text-orange-700", bar: "#fb923c" },
  note:    { label: "Note",    Icon: StickyNote,    color: "bg-teal-100 text-teal-700",     bar: "#2dd4bf" },
};

const STATUS_META: Record<ResearchStatus, { label: string; chip: string; bg: string; dot: string }> = {
  to_explore: { label: "To Explore", chip: "bg-amber-100 text-amber-800",   bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400" },
  reading:    { label: "Reading",    chip: "bg-sky-100 text-sky-800",       bg: "bg-sky-50 border-sky-200",       dot: "bg-sky-400" },
  working:    { label: "Working",    chip: "bg-violet-100 text-violet-800", bg: "bg-violet-50 border-violet-200", dot: "bg-violet-500" },
  completed:  { label: "Completed",  chip: "bg-emerald-100 text-emerald-800", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
};

const PIPELINE_ORDER: ResearchStatus[] = ["to_explore", "reading", "working", "completed"];

const DEADLINE_PREFIX = "📅 Deadline: ";

function extractDeadline(notes: string | null): { deadline: string; cleanNotes: string } {
  if (!notes) return { deadline: "", cleanNotes: "" };
  const lines = notes.split("\n");
  const idx = lines.findIndex(l => l.startsWith(DEADLINE_PREFIX));
  if (idx === -1) return { deadline: "", cleanNotes: notes };
  const deadline = lines[idx].replace(DEADLINE_PREFIX, "").trim();
  const cleanNotes = lines.filter((_, i) => i !== idx).join("\n").trimStart();
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
  return { title: item.title, type: item.type, authors: item.authors ?? "", source: item.source ?? "", summary: item.summary ?? "", tagsText: item.tags.join(", "), status: item.status, notes: cleanNotes, deadline };
}

function payloadFromForm(form: ResearchFormState) {
  return { title: form.title.trim(), type: form.type, authors: form.authors.trim() || null, source: form.source.trim() || null, summary: form.summary.trim() || null, tags: form.tagsText.split(",").map(t => t.trim()).filter(Boolean), status: form.status, notes: buildNotes(form.deadline, form.notes) };
}

function renderBullets(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletGroup: string[] = [];
  const flushBullets = (key: string) => {
    if (bulletGroup.length > 0) {
      elements.push(<ul key={`ul-${key}`} className="list-disc list-inside space-y-0.5">{bulletGroup.map((b, i) => <li key={i} className="text-[12px] text-slate-500 leading-relaxed">{b}</li>)}</ul>);
      bulletGroup = [];
    }
  };
  lines.forEach((line, i) => {
    const stripped = line.trimStart();
    if (stripped.startsWith("- ") || stripped.startsWith("• ") || stripped.startsWith("* ")) bulletGroup.push(stripped.slice(2).trimStart());
    else { flushBullets(String(i)); if (stripped) elements.push(<p key={i} className="text-[12px] text-slate-500 leading-relaxed">{stripped}</p>); }
  });
  flushBullets("end");
  return <div className="space-y-1">{elements}</div>;
}

type AcademicProfiles = { github: string; researchgate: string; kaggle: string; scholar: string };
const EMPTY_PROFILES: AcademicProfiles = { github: "", researchgate: "", kaggle: "", scholar: "" };
function useAcademicProfiles() {
  const key = "atlas_academic_profiles";
  const load = (): AcademicProfiles => { try { return { ...EMPTY_PROFILES, ...JSON.parse(localStorage.getItem(key) ?? "{}") }; } catch { return { ...EMPTY_PROFILES }; } };
  const [profiles, setProfilesState] = useState<AcademicProfiles>(load);
  const save = (p: AcademicProfiles) => { localStorage.setItem(key, JSON.stringify(p)); setProfilesState(p); };
  return { profiles, save };
}

// ─── Pipeline visualization ──────────────────────────────────────────────────
function ResearchPipeline({ items }: { items: ResearchItem[] }) {
  const counts = useMemo(() => {
    const map: Record<ResearchStatus, number> = { to_explore: 0, reading: 0, working: 0, completed: 0 };
    for (const item of items) map[item.status] = (map[item.status] ?? 0) + 1;
    return map;
  }, [items]);
  const total = items.length;
  if (total === 0) return null;

  return (
    <div className="bg-white border border-[#e4ddd2] rounded-2xl px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-emerald-600" />
        <h2 className="text-[14px] font-semibold text-slate-800">Research Pipeline</h2>
        <span className="ml-auto text-[11px] text-slate-400">{total} total</span>
      </div>
      {/* Stage bars */}
      <div className="flex gap-1 h-2.5 rounded-full overflow-hidden mb-3">
        {PIPELINE_ORDER.map(status => {
          const pct = total > 0 ? (counts[status] / total) * 100 : 0;
          if (pct === 0) return null;
          const colors: Record<ResearchStatus, string> = { to_explore: "bg-amber-300", reading: "bg-sky-400", working: "bg-violet-400", completed: "bg-emerald-500" };
          return <div key={status} className={`${colors[status]} transition-all duration-500`} style={{ width: `${pct}%` }} />;
        })}
      </div>
      {/* Stage labels */}
      <div className="flex items-center gap-1">
        {PIPELINE_ORDER.map((status, i) => {
          const meta = STATUS_META[status];
          return (
            <div key={status} className="flex-1 flex items-center gap-1 min-w-0">
              <div className={`flex flex-col items-center flex-1 min-w-0`}>
                <div className={`w-full rounded-lg border py-2 px-1.5 text-center ${meta.bg}`}>
                  <div className="text-[18px] font-bold text-slate-800 leading-none">{counts[status]}</div>
                  <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5 leading-tight">{meta.label}</div>
                </div>
              </div>
              {i < PIPELINE_ORDER.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Type breakdown ──────────────────────────────────────────────────────────
function TypeBreakdown({ items }: { items: ResearchItem[] }) {
  const data = useMemo(() => {
    const map = new Map<ResearchType, number>();
    for (const item of items) map.set(item.type, (map.get(item.type) ?? 0) + 1);
    return (Object.keys(TYPE_META) as ResearchType[])
      .map(t => ({ ...TYPE_META[t], id: t, count: map.get(t) ?? 0 }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [items]);
  const max = Math.max(...data.map(d => d.count), 1);
  if (data.length === 0) return null;

  return (
    <div className="bg-white border border-[#e4ddd2] rounded-2xl px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Library className="h-4 w-4 text-emerald-600" />
        <h2 className="text-[14px] font-semibold text-slate-800">By Type</h2>
      </div>
      <div className="space-y-2">
        {data.map(({ id, label, color, bar, count }) => (
          <div key={id} className="flex items-center gap-2.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${color} w-14 text-center shrink-0`}>{label}</span>
            <div className="flex-1 h-2 rounded-full bg-[#f4f0e8] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(count / max) * 100}%`, backgroundColor: bar }} />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 w-4 shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Research card ───────────────────────────────────────────────────────────
function ResearchCard({ item, onEdit, onDelete, onStatusChange }: {
  item: ResearchItem; onEdit: () => void; onDelete: () => void;
  onStatusChange: (status: ResearchStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const TypeIcon = TYPE_META[item.type].Icon;
  const typeMeta = TYPE_META[item.type];
  const status = STATUS_META[item.status];
  const { deadline, cleanNotes } = extractDeadline(item.notes);

  const now = new Date(); now.setHours(0, 0, 0, 0);
  let daysLeft: number | null = null;
  if (deadline) {
    const d = new Date(deadline.includes("T") || deadline.includes(" ") ? deadline : deadline + "T00:00:00");
    d.setHours(0, 0, 0, 0);
    daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  }

  const hasSummary = !!item.summary;
  const hasNotes = !!cleanNotes;
  const hasDetails = hasSummary || hasNotes;
  const nextStatus = PIPELINE_ORDER[PIPELINE_ORDER.indexOf(item.status) + 1] as ResearchStatus | undefined;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="group bg-white border border-[#e4ddd2] rounded-2xl p-4 hover:shadow-md transition-all shadow-sm">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.color}`}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[14px] font-semibold text-slate-800 leading-snug break-words">{item.title}</h3>
                {item.authors && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.authors}</p>}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {item.source && (
                  <a href={item.source} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>
                )}
                <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable summary/notes */}
        {hasDetails && (
          <div className="mt-3 ml-12">
            {expanded ? (
              <div className="space-y-2">
                {hasSummary && <div>{renderBullets(item.summary!)}</div>}
                {hasNotes && (
                  <div className="pt-2 border-t border-[#f0ebe0]">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                    {renderBullets(cleanNotes)}
                  </div>
                )}
                <button onClick={() => setExpanded(false)} className="flex items-center gap-1 text-[11px] text-emerald-600 hover:underline"><ChevronUp className="h-3 w-3" />Hide details</button>
              </div>
            ) : (
              <button onClick={() => setExpanded(true)} className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-600 transition-colors"><ChevronDown className="h-3 w-3" />Show details</button>
            )}
          </div>
        )}

        {/* Footer: status chips + quick advance */}
        <div className="mt-3 ml-12 flex flex-wrap items-center gap-1.5">
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${status.chip}`}>{status.label}</span>
          {deadline && daysLeft !== null && (
            <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${daysLeft < 0 ? "bg-red-100 text-red-700" : daysLeft <= 7 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
              <Calendar className="h-3 w-3" />
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
            </span>
          )}
          {item.tags.slice(0, 4).map(tag => <Badge key={tag} variant="secondary" className="text-[10px] font-medium">{tag}</Badge>)}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">{format(new Date(item.createdAt), "MMM d")}</span>
            {nextStatus && (
              <button onClick={() => onStatusChange(nextStatus)}
                className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-emerald-700 border border-[#e4ddd2] hover:border-emerald-300 px-2 py-0.5 rounded-full transition-colors">
                → {STATUS_META[nextStatus].label}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors ${active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-[#e4ddd2] hover:border-slate-300 hover:text-slate-800"}`}>
      {children}
    </button>
  );
}

function EmptyState({ onAdd, hasItems }: { onAdd: () => void; hasItems: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#e4ddd2] bg-white px-6 py-16 flex flex-col items-center text-center">
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-400 shadow-md flex items-center justify-center mb-3">
        <Microscope className="h-5 w-5 text-white" />
      </div>
      <h3 className="text-[16px] font-semibold text-slate-800">{hasItems ? "Nothing matches those filters" : "Start your research library"}</h3>
      <p className="text-[13px] text-slate-500 mt-1.5 max-w-xs">
        {hasItems ? "Try clearing the search or pick a different status." : "Save papers, articles, books, datasets, and ideas — and link them to a goal."}
      </p>
      {!hasItems && <Button onClick={onAdd} size="sm" className="mt-5 gap-1.5"><Plus className="h-3.5 w-3.5" />Add your first item</Button>}
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
          <Input id="r-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Attention Is All You Need" required autoFocus className="h-11" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">Type</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as ResearchType })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(TYPE_META) as ResearchType[]).map(t => <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ResearchStatus })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(STATUS_META) as ResearchStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold">Authors / Source name</Label>
          <Input value={form.authors} onChange={e => setForm({ ...form, authors: e.target.value })} placeholder="e.g. Vaswani et al." className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold">URL / Source</Label>
          <Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="https://arxiv.org/..." className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold">Tags (comma-separated)</Label>
          <Input value={form.tagsText} onChange={e => setForm({ ...form, tagsText: e.target.value })} placeholder="NLP, transformers, attention" className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold">Deadline (optional)</Label>
          <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold">Summary</Label>
          <Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Key points, findings, or abstract…" className="min-h-[90px] resize-y" rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold">Personal notes</Label>
          <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Your thoughts, questions, follow-ups…" className="min-h-[80px] resize-y" rows={3} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add item"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default function ResearchPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profiles, save: saveProfiles } = useAcademicProfiles();
  const [showProfilesPanel, setShowProfilesPanel] = useState(false);
  const [profileDraft, setProfileDraft] = useState<AcademicProfiles>(profiles);

  const { data: items = [], isLoading } = useQuery({ queryKey: ["research"], queryFn: () => api<ResearchItem[]>("/research") });

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
  const quickStatus = useMutation({
    mutationFn: ({ id, status, item }: { id: number; status: ResearchStatus; item: ResearchItem }) =>
      api<ResearchItem>(`/research/${id}`, { method: "PUT", body: JSON.stringify({ ...payloadFromForm(toForm(item)), status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["research"] }),
    onError: (e: Error) => toast({ title: "Couldn't update status", description: e.message, variant: "destructive" }),
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
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (!q) return true;
      return [i.title, i.authors, i.summary, i.notes, i.tags.join(" ")].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [items, statusFilter, typeFilter, search]);

  const hasAnyProfile = Object.values(profiles).some(v => v.trim());

  return (
    <div className="page-enter space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-slate-800 leading-tight">Research</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Capture papers, articles, and ideas — tied to your goals.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => { setProfileDraft(profiles); setShowProfilesPanel(v => !v); }} className="gap-1.5 text-[12px]">
            <Link2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Profiles</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={o => o ? setDialogOpen(true) : closeDialog()}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} size="sm" className="gap-1.5 text-[13px] shrink-0">
                <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Add item</span><span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <ResearchDialog form={form} setForm={setForm} onSubmit={submit} editing={!!editing} saving={createMut.isPending || updateMut.isPending} />
          </Dialog>
        </div>
      </div>

      {/* Profiles panel */}
      {showProfilesPanel && (
        <div className="rounded-2xl border border-[#e4ddd2] bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[14px] font-semibold text-slate-800">Academic & Social Profiles</h2>
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
                <Input value={profileDraft[key]} onChange={e => setProfileDraft(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="h-10 text-[13px]" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="text-[13px]" onClick={() => setShowProfilesPanel(false)}>Cancel</Button>
            <Button size="sm" className="text-[13px]" onClick={() => { saveProfiles(profileDraft); setShowProfilesPanel(false); toast({ title: "Profiles saved" }); }}>Save</Button>
          </div>
          {hasAnyProfile && (
            <div className="pt-2 border-t border-[#f0ebe0] flex flex-wrap gap-3">
              {profiles.github && <a href={profiles.github} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 transition-colors"><Github className="h-3.5 w-3.5" />GitHub</a>}
              {profiles.researchgate && <a href={profiles.researchgate} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 transition-colors"><ExternalLink className="h-3.5 w-3.5" />ResearchGate</a>}
              {profiles.kaggle && <a href={profiles.kaggle} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 transition-colors"><ExternalLink className="h-3.5 w-3.5" />Kaggle</a>}
              {profiles.scholar && <a href={profiles.scholar} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 transition-colors"><ExternalLink className="h-3.5 w-3.5" />Google Scholar</a>}
            </div>
          )}
        </div>
      )}

      {/* Analytics: pipeline + type breakdown */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResearchPipeline items={items} />
          <TypeBreakdown items={items} />
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, authors, tags…" className="pl-10 h-10 text-[13px] rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</Chip>
          {(Object.keys(STATUS_META) as ResearchStatus[]).map(s => (
            <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{STATUS_META[s].label}</Chip>
          ))}
          <span className="mx-1 self-center w-px h-4 bg-[#e4ddd2]" />
          <Chip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>Any type</Chip>
          {(Object.keys(TYPE_META) as ResearchType[]).map(t => (
            <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>{TYPE_META[t].label}</Chip>
          ))}
        </div>
        {items.length > 0 && (
          <p className="text-[11px] text-slate-400">{filtered.length} {filtered.length === 1 ? "item" : "items"}{search ? ` matching "${search}"` : ""}</p>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={openCreate} hasItems={items.length > 0} />
        ) : (
          filtered.map(item => (
            <ResearchCard key={item.id} item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => { if (confirm(`Delete "${item.title}"?`)) deleteMut.mutate(item.id); }}
              onStatusChange={status => quickStatus.mutate({ id: item.id, status, item })}
            />
          ))
        )}
      </div>
    </div>
  );
}
