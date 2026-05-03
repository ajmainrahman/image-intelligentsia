import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, NotebookPen, Plus, Save, Trash2, Pin, Search, Hash, Sparkles, ArrowUpDown, Bold, Italic, Underline, List, ListOrdered, CheckSquare, Link2, Heading2, Heading3, Lightbulb, Quote } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const LEGACY_NOTE_KEY = "image_intelligentsia_notepad";
const PROMPTS = [
  "What progress did you make today?",
  "What did you learn from your latest reading?",
  "What should you focus on next?",
  "What felt difficult and why?",
  "What would make this week a win?",
];
const QUICK_TAGS = ["planning", "research", "building", "reflection", "design", "writing", "feedback", "milestone", "problem", "win"];

type Note = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type ToolbarAction = {
  label: string;
  icon: ReactNode;
  insert: string;
};

function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function extractTags(note: Note): string[] {
  const fromTitle = note.title.trim().match(/#[\w-]+/g) ?? [];
  const fromContent = note.content.match(/#[\w-]+/g) ?? [];
  return [...new Set([...fromTitle, ...fromContent].map((tag) => tag.slice(1).toLowerCase()))];
}

function notePreview(note: Note): string {
  return note.content.trim().slice(0, 120) || "No content yet.";
}

function sortNotes(notes: Note[]) {
  return [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export default function NotepadPage() {
  const queryClient = useQueryClient();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"recent" | "alpha">("recent");
  const [lastSaved, setLastSaved] = useState("Ready");
  const [legacySeeded, setLegacySeeded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => api<Note[]>("/notes"),
  });

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? notes[0],
    [notes, selectedNoteId],
  );

  useEffect(() => {
    if (selectedNoteId == null && notes[0]?.id) setSelectedNoteId(notes[0].id);
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (legacySeeded) return;
    const legacyNote = localStorage.getItem(LEGACY_NOTE_KEY);
    if (!legacyNote) return;
    setLegacySeeded(true);
    createNote.mutate({ title: "Untitled note", content: legacyNote });
    localStorage.removeItem(LEGACY_NOTE_KEY);
  }, [legacySeeded]);

  const createNote = useMutation({
    mutationFn: (data: { title: string; content: string }) => api<Note>("/notes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (note) => {
      setSelectedNoteId(note.id);
      setLastSaved("Saved");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });

  const updateNote = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title: string; content: string } }) =>
      api<Note>(`/notes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (note) => {
      setSelectedNoteId(note.id);
      setLastSaved("Saved");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: (id: number) => api(`/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setLastSaved("Saved");
    },
  });

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((note) => extractTags(note).forEach((tag) => tags.add(tag)));
    return [...tags].sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = notes.filter((note) => {
      const tags = extractTags(note);
      const matchesQuery = !q || note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q) || tags.some((tag) => tag.includes(q));
      const matchesTag = tagFilter === "all" || tags.includes(tagFilter);
      return matchesQuery && matchesTag;
    });
    return sortMode === "alpha" ? [...base].sort((a, b) => a.title.localeCompare(b.title)) : sortNotes(base);
  }, [notes, search, tagFilter, sortMode]);

  const persist = (updates: Partial<Pick<Note, "title" | "content">>) => {
    if (!selectedNote) return;
    setLastSaved("Saving...");
    const payload = {
      title: updates.title ?? selectedNote.title,
      content: updates.content ?? selectedNote.content,
    };
    updateNote.mutate({ id: selectedNote.id, data: payload });
  };

  const addNote = () => {
    createNote.mutate({ title: "", content: "" });
  };

  const toggleDelete = () => {
    if (!selectedNote) return;
    if (confirm("Delete this note?")) deleteNote.mutate(selectedNote.id);
  };

  const insertIntoNote = (snippet: string) => {
    if (!selectedNote) return;
    persist({ content: `${selectedNote.content}${selectedNote.content && !selectedNote.content.endsWith("\n") ? "\n" : ""}${snippet}` });
  };

  const toolbarActions: ToolbarAction[] = [
    { label: "Bold", icon: <Bold className="h-4 w-4" />, insert: "**bold**" },
    { label: "Italic", icon: <Italic className="h-4 w-4" />, insert: "_italic_" },
    { label: "Underline", icon: <Underline className="h-4 w-4" />, insert: "<u>underline</u>" },
    { label: "Heading 2", icon: <Heading2 className="h-4 w-4" />, insert: "## Heading" },
    { label: "Heading 3", icon: <Heading3 className="h-4 w-4" />, insert: "### Heading" },
    { label: "Bullet list", icon: <List className="h-4 w-4" />, insert: "- Item 1\n- Item 2" },
    { label: "Numbered list", icon: <ListOrdered className="h-4 w-4" />, insert: "1. Item 1\n2. Item 2" },
    { label: "Checklist", icon: <CheckSquare className="h-4 w-4" />, insert: "- [ ] Task 1\n- [ ] Task 2" },
    { label: "Link", icon: <Link2 className="h-4 w-4" />, insert: "[title](https://example.com)" },
    { label: "Quote", icon: <Quote className="h-4 w-4" />, insert: "> Reflection" },
  ];

  return (
    <div className="space-y-8 page-enter max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notepad</h1>
          <p className="text-muted-foreground mt-1">Write quick thoughts, interview notes, and ideas in one calm place.</p>
        </div>
        <Button onClick={addNote} className="gap-2">
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <Card className="border-primary/15 bg-card/95 shadow-sm h-fit">
          <CardHeader>
            <div className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookPen className="h-4 w-4 text-primary" />
                Notes
              </CardTitle>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes" className="pl-9" />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant={tagFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTagFilter("all")}>All</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSortMode((m) => (m === "recent" ? "alpha" : "recent"))}>
                    <ArrowUpDown className="h-4 w-4" />
                    {sortMode === "recent" ? "Recent" : "A-Z"}
                  </Button>
                </div>
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allTags.slice(0, 8).map((tag) => (
                      <Button key={tag} type="button" variant={tagFilter === tag ? "default" : "outline"} size="sm" onClick={() => setTagFilter(tagFilter === tag ? "all" : tag)} className="gap-1">
                        <Hash className="h-3.5 w-3.5" />
                        {tag}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? <p className="text-sm text-muted-foreground">Loading notes…</p> : filteredNotes.map((note) => {
              const isSelected = note.id === selectedNote?.id;
              const tags = extractTags(note);
              return (
                <button key={note.id} onClick={() => setSelectedNoteId(note.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${isSelected ? "border-primary/40 bg-primary/10" : "border-border bg-background/50 hover:border-primary/20"}`}>
                  <div className="font-medium line-clamp-1">{note.title.trim() || "Untitled note"}</div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    <span>{countWords(note.content)} words</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{notePreview(note)}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 3).map((tag) => <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">#{tag}</span>)}
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-primary/15 bg-card/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-primary" />
              <CardTitle>{selectedNote?.title.trim() || "Untitled note"}</CardTitle>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="secondary" className="gap-1"><CalendarDays className="h-3.5 w-3.5" />{selectedNote ? new Date(selectedNote.updatedAt).toLocaleDateString() : ""}</Badge>
              <Badge variant="outline">{selectedNote ? countWords(selectedNote.content) : 0} words</Badge>
              <span className="flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />{lastSaved}</span>
            </div>
          </CardHeader>
          {selectedNote && (
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setShowPrompt((v) => !v)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Need inspiration? See today&apos;s prompt
                  </button>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="gap-2">
                          <Sparkles className="h-4 w-4" />
                          Add tag
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Quick tags</p>
                          <div className="flex flex-wrap gap-2">
                            {QUICK_TAGS.map((tag) => (
                              <Button key={tag} type="button" variant="outline" size="sm" onClick={() => insertIntoNote(`#${tag} `)} className="h-8 rounded-full">
                                +{tag}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {showPrompt && (
                  <div className="rounded-xl bg-background/80 border border-border p-4 text-sm text-muted-foreground">
                    {PROMPTS[0]}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-background/80 p-2">
                  {toolbarActions.map((action) => (
                    <Button key={action.label} type="button" variant="ghost" size="sm" onClick={() => insertIntoNote(action.insert)} className="h-8 gap-2 px-3">
                      {action.icon}
                      <span className="hidden sm:inline">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <Input value={selectedNote.title} onChange={(event) => persist({ title: event.target.value })} placeholder="Note title" className="bg-background/70" />
                <Button type="button" variant="outline" onClick={toggleDelete}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => persist({ content: `${selectedNote.content}${selectedNote.content.trim() ? "\n" : ""}#idea ` })}><Sparkles className="h-4 w-4" />Tag idea</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => persist({ content: `${selectedNote.content}${selectedNote.content.trim() ? "\n" : ""}#research ` })}><Hash className="h-4 w-4" />Tag research</Button>
              </div>
              <Textarea value={selectedNote.content} onChange={(event) => persist({ content: event.target.value })} placeholder="What progress did you make? Any thoughts..." className="min-h-[520px] resize-none border-primary/10 bg-background/70 text-base leading-7" />
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
