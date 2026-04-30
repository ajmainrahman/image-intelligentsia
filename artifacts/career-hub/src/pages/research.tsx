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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Microscope,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Search,
  FileText,
  BookOpen,
  GraduationCap,
  Database,
  Lightbulb,
  StickyNote,
  Library,
} from "lucide-react";

type ResearchStatus = "to_explore" | "reading" | "completed";
type ResearchType =
  | "paper"
  | "article"
  | "book"
  | "dataset"
  | "thesis"
  | "topic"
  | "note";

type ResearchItem = {
  id: number;
  title: string;
  type: ResearchType;
  authors: string | null;
  source: string | null;
  summary: string | null;
  tags: string[];
  status: ResearchStatus;
  notes: string | null;
  goalId: number | null;
  createdAt: string;
  updatedAt: string;
};

type ResearchFormState = {
  title: string;
  type: ResearchType;
  authors: string;
  source: string;
  summary: string;
  tagsText: string;
  status: ResearchStatus;
  notes: string;
};

const EMPTY_FORM: ResearchFormState = {
  title: "",
  type: "paper",
  authors: "",
  source: "",
  summary: "",
  tagsText: "",
  status: "to_explore",
  notes: "",
};

const TYPE_META: Record<
  ResearchType,
  { label: string; Icon: React.ElementType }
> = {
  paper: { label: "Paper", Icon: FileText },
  article: { label: "Article", Icon: Library },
  book: { label: "Book", Icon: BookOpen },
  dataset: { label: "Dataset", Icon: Database },
  thesis: { label: "Thesis", Icon: GraduationCap },
  topic: { label: "Topic", Icon: Lightbulb },
  note: { label: "Note", Icon: StickyNote },
};

const STATUS_META: Record<
  ResearchStatus,
  { label: string; chip: string; ring: string }
> = {
  to_explore: {
    label: "To explore",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    ring: "ring-amber-300/40",
  },
  reading: {
    label: "Reading",
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    ring: "ring-sky-300/40",
  },
  completed: {
    label: "Completed",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    ring: "ring-emerald-300/40",
  },
};

function toForm(item: ResearchItem): ResearchFormState {
  return {
    title: item.title,
    type: item.type,
    authors: item.authors ?? "",
    source: item.source ?? "",
    summary: item.summary ?? "",
    tagsText: item.tags.join(", "),
    status: item.status,
    notes: item.notes ?? "",
  };
}

function payloadFromForm(form: ResearchFormState) {
  return {
    title: form.title.trim(),
    type: form.type,
    authors: form.authors.trim() || null,
    source: form.source.trim() || null,
    summary: form.summary.trim() || null,
    tags: form.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    status: form.status,
    notes: form.notes.trim() || null,
  };
}

export default function ResearchPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery({
    queryKey: ["research"],
    queryFn: () => api<ResearchItem[]>("/research"),
  });

  const createMut = useMutation({
    mutationFn: (form: ResearchFormState) =>
      api<ResearchItem>("/research", {
        method: "POST",
        body: JSON.stringify(payloadFromForm(form)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast({ title: "Research item added" });
      closeDialog();
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, form }: { id: number; form: ResearchFormState }) =>
      api<ResearchItem>(`/research/${id}`, {
        method: "PUT",
        body: JSON.stringify(payloadFromForm(form)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research"] });
      toast({ title: "Updated" });
      closeDialog();
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't update", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api<void>(`/research/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research"] });
      toast({ title: "Deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't delete", description: e.message, variant: "destructive" }),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResearchItem | null>(null);
  const [form, setForm] = useState<ResearchFormState>(EMPTY_FORM);

  const [statusFilter, setStatusFilter] = useState<"all" | ResearchStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ResearchType>("all");
  const [search, setSearch] = useState("");

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }
  function openEdit(item: ResearchItem) {
    setEditing(item);
    setForm(toForm(item));
    setDialogOpen(true);
  }
  function closeDialog() {
    setDialogOpen(false);
    setTimeout(() => {
      setEditing(null);
      setForm(EMPTY_FORM);
    }, 150);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
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
      const hay = [i.title, i.authors, i.summary, i.notes, i.tags.join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, statusFilter, typeFilter, search]);

  const stats = useMemo(() => {
    const list = items ?? [];
    return {
      total: list.length,
      reading: list.filter((i) => i.status === "reading").length,
      completed: list.filter((i) => i.status === "completed").length,
      toExplore: list.filter((i) => i.status === "to_explore").length,
    };
  }, [items]);

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-400 shadow-md shrink-0">
            <Microscope className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight">
              Research
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Capture papers, articles, and ideas — and tie them to your goals.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="shrink-0 h-10 sm:h-9">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add item</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <ResearchDialog
            form={form}
            setForm={setForm}
            onSubmit={submit}
            editing={!!editing}
            saving={createMut.isPending || updateMut.isPending}
          />
        </Dialog>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Total" value={stats.total} />
        <StatTile label="To explore" value={stats.toExplore} />
        <StatTile label="Reading" value={stats.reading} />
        <StatTile label="Completed" value={stats.completed} />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, authors, tags…"
            className="pl-9 h-11"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            All
          </Chip>
          {(Object.keys(STATUS_META) as ResearchStatus[]).map((s) => (
            <Chip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_META[s].label}
            </Chip>
          ))}
          <span className="mx-1 self-center w-px h-5 bg-border" />
          <Chip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
            Any type
          </Chip>
          {(Object.keys(TYPE_META) as ResearchType[]).map((t) => (
            <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {TYPE_META[t].label}
            </Chip>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={openCreate} hasItems={(items?.length ?? 0) > 0} />
        ) : (
          filtered.map((item) => (
            <ResearchCard
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => {
                if (confirm(`Delete "${item.title}"?`)) deleteMut.mutate(item.id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="text-2xl font-bold text-foreground mt-0.5 leading-none">
        {value}
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
      }`}
    >
      {children}
    </button>
  );
}

function ResearchCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ResearchItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const TypeIcon = TYPE_META[item.type].Icon;
  const status = STATUS_META[item.status];
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="mt-0.5 h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-[15.5px] leading-snug break-words">
                {item.title}
              </CardTitle>
              <div className="text-[12px] text-muted-foreground mt-0.5 truncate">
                {item.authors || TYPE_META[item.type].label}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {item.source && (
              <a
                href={item.source}
                target="_blank"
                rel="noreferrer noopener"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Open source"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={onEdit}
              aria-label="Edit"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              aria-label="Delete"
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {item.summary && (
          <p className="text-[13.5px] text-muted-foreground leading-relaxed line-clamp-3">
            {item.summary}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.chip}`}>
            {status.label}
          </span>
          {item.tags.slice(0, 6).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10.5px] font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onAdd, hasItems }: { onAdd: () => void; hasItems: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 flex flex-col items-center text-center">
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-400 shadow-md flex items-center justify-center mb-4">
        <Microscope className="h-5 w-5 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        {hasItems ? "Nothing matches those filters" : "Start your research library"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        {hasItems
          ? "Try clearing the search or pick a different status."
          : "Save papers, articles, books, datasets, and ideas — and link them to a goal."}
      </p>
      {!hasItems && (
        <Button onClick={onAdd} className="mt-5">
          <Plus className="h-4 w-4" />
          Add your first item
        </Button>
      )}
    </div>
  );
}

function ResearchDialog({
  form,
  setForm,
  onSubmit,
  editing,
  saving,
}: {
  form: ResearchFormState;
  setForm: (f: ResearchFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  editing: boolean;
  saving: boolean;
}) {
  return (
    <DialogContent className="sm:max-w-lg max-h-[92dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit research item" : "Add research item"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="r-title">Title</Label>
          <Input
            id="r-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Attention Is All You Need"
            required
            autoFocus
            className="h-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as ResearchType })}
            >
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_META) as ResearchType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as ResearchStatus })}
            >
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as ResearchStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-authors">Authors</Label>
          <Input
            id="r-authors"
            value={form.authors}
            onChange={(e) => setForm({ ...form, authors: e.target.value })}
            placeholder="Vaswani et al."
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-source">Source URL</Label>
          <Input
            id="r-source"
            type="url"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="https://arxiv.org/abs/…"
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-summary">Summary</Label>
          <Textarea
            id="r-summary"
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="What's it about? Key findings?"
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-tags">Tags <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
          <Input
            id="r-tags"
            value={form.tagsText}
            onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
            placeholder="ml, transformers, nlp"
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-notes">Notes</Label>
          <Textarea
            id="r-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Personal takeaways, citations to follow up…"
            rows={3}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="submit" disabled={saving} className="h-11 sm:h-10">
            {saving ? "Saving…" : editing ? "Save changes" : "Add to library"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
