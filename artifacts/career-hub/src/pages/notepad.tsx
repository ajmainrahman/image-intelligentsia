import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NotebookPen, Plus, Trash2, Search, Pencil, Bold, Italic, Underline as UnderlineIcon,
  Heading2, Heading3, List, ListOrdered, CheckSquare, Link as LinkIcon,
  Tag, FileText, Clock, Hash, AlignLeft,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import LinkExt from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

const QUICK_TAGS = ["planning", "research", "reflection", "learning", "win", "problem", "idea", "goal"];

type Note = { id: number; title: string; content: string; createdAt: string; updatedAt: string };

function countWords(content: string): number {
  const plain = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return plain ? plain.split(" ").filter(Boolean).length : 0;
}
function extractTags(note: Note): string[] {
  const text = note.title + " " + note.content.replace(/<[^>]*>/g, " ");
  return [...new Set((text.match(/#[\w-]+/g) ?? []).map((t) => t.slice(1).toLowerCase()))];
}
function notePreview(note: Note): string {
  const plain = note.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return plain.slice(0, 120) || "No content yet.";
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
    <button type="button" title={title} onClick={onClick}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors ${active ? "bg-primary/15 text-primary" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
      {icon}
    </button>
  );
  const handleLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", prev ?? "https://");
    if (url === null) return;
    if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b border-border pb-2.5 mb-0 px-4 pt-3 bg-secondary/40 rounded-t-xl">
      <div className="flex items-center gap-0.5">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-4 w-4" />, "Bold")}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-4 w-4" />, "Italic")}
        {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="h-4 w-4" />, "Underline")}
      </div>
      <div className="w-px h-5 bg-border mx-1.5" />
      <div className="flex items-center gap-0.5">
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-4 w-4" />, "Heading")}
        {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-4 w-4" />, "Sub-heading")}
      </div>
      <div className="w-px h-5 bg-border mx-1.5" />
      <div className="flex items-center gap-0.5">
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-4 w-4" />, "Bullet List")}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-4 w-4" />, "Numbered List")}
        {btn(editor.isActive("taskList"), () => editor.chain().focus().toggleTaskList().run(), <CheckSquare className="h-4 w-4" />, "Checklist")}
      </div>
      <div className="w-px h-5 bg-border mx-1.5" />
      {btn(editor.isActive("link"), handleLink, <LinkIcon className="h-4 w-4" />, "Link")}
    </div>
  );
}

function NoteEditor({ content, onChange, placeholder }: { content: string; onChange: (html: string) => void; placeholder: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      UnderlineExt,
      TaskList,
      TaskItem.configure({ nested: true }),
      LinkExt.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate({ editor }) { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: [
          "min-h-[360px] px-5 py-4 text-[15px] leading-7 text-foreground outline-none",
          "prose prose-slate max-w-none",
          "prose-headings:font-bold prose-h2:text-[20px] prose-h3:text-[16px]",
          "prose-ul:my-2 prose-li:my-0.5",
          "prose-a:text-primary prose-a:underline",
          "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
          "[&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem]]:items-start",
          "[&_li[data-type=taskItem]>label]:flex [&_li[data-type=taskItem]>label]:items-center [&_li[data-type=taskItem]>label]:mt-1",
          "[&_li[data-type=taskItem]>label>input]:mr-2 [&_li[data-type=taskItem]>label>input]:h-4 [&_li[data-type=taskItem]>label>input]:w-4",
        ].join(" "),
      },
    },
  });
  useEffect(() => { if (editor) editor.commands.setContent(content, false); }, [editor, content]);
  return (
    <div className="rounded-xl border border-border bg-background flex flex-col shadow-sm">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}

export default function NotepadPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [lastSaved, setLastSaved] = useState<"ready" | "saving" | "saved">("ready");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const saveTimer = useRef<number | null>(null);

  const { data: notes = [], isLoading } = useQuery<Note[]>({ queryKey: ["notes"], queryFn: () => api<Note[]>("/notes") });

  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedNoteId) ?? notes[0], [notes, selectedNoteId]);

  useEffect(() => {
    if (!selectedNote) return;
    setDraftTitle(selectedNote.title);
    setDraftContent(selectedNote.content);
  }, [selectedNote?.id]);

  useEffect(() => {
    if (selectedNoteId == null && notes[0]?.id) setSelectedNoteId(notes[0].id);
  }, [notes, selectedNoteId]);

  const createNote = useMutation({
    mutationFn: (data: { title: string; content: string }) => api<Note>("/notes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (note) => { setSelectedNoteId(note.id); setLastSaved("saved"); queryClient.invalidateQueries({ queryKey: ["notes"] }); toast({ title: "Note created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateNote = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title: string; content: string } }) => api<Note>(`/notes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { setLastSaved("saved"); queryClient.invalidateQueries({ queryKey: ["notes"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteNote = useMutation({
    mutationFn: (id: number) => api(`/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => { setSelectedNoteId(null); queryClient.invalidateQueries({ queryKey: ["notes"] }); toast({ title: "Note deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const persist = useCallback((updates: { title?: string; content?: string }) => {
    setLastSaved("saving");
    const nextTitle = updates.title !== undefined ? updates.title : draftTitle;
    const nextContent = updates.content !== undefined ? updates.content : draftContent;
    if (updates.title !== undefined) setDraftTitle(nextTitle);
    if (updates.content !== undefined) setDraftContent(nextContent);
    if (!selectedNote) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      updateNote.mutate({ id: selectedNote.id, data: { title: nextTitle, content: nextContent } });
    }, 800);
  }, [draftTitle, draftContent, selectedNote]);

  const allTags = useMemo(() => { const s = new Set<string>(); notes.forEach((n) => extractTags(n).forEach((t) => s.add(t))); return [...s].sort(); }, [notes]);
  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes
      .filter((n) => {
        const tags = extractTags(n);
        const plain = n.content.replace(/<[^>]*>/g, " ");
        return (!q || n.title.toLowerCase().includes(q) || plain.toLowerCase().includes(q) || tags.some((t) => t.includes(q))) &&
          (tagFilter === "all" || tags.includes(tagFilter));
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, search, tagFilter]);

  const totalWords = useMemo(() => notes.reduce((s, n) => s + countWords(n.content), 0), [notes]);

  return (
    <div className="space-y-5 page-enter pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-foreground leading-tight">Notepad</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            {notes.length} note{notes.length !== 1 ? "s" : ""} · {totalWords.toLocaleString()} words total
          </p>
        </div>
        <Button
          onClick={() => createNote.mutate({ title: "", content: "" })}
          disabled={createNote.isPending}
          className="gap-2 text-[14px] h-11 px-5"
        >
          <Plus className="h-4 w-4" />New Note
        </Button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 min-h-[620px]">
        {/* Left panel: list */}
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes…" className="pl-10 text-[13px] h-10 rounded-xl" />
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTagFilter("all")}
                className={`text-[12px] px-2.5 py-1 rounded-full font-medium transition-colors ${tagFilter === "all" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                All
              </button>
              {allTags.slice(0, 10).map((tag) => (
                <button key={tag} onClick={() => setTagFilter(tag === tagFilter ? "all" : tag)}
                  className={`text-[12px] px-2.5 py-1 rounded-full font-medium transition-colors ${tagFilter === tag ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Note list */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[580px] pr-1">
            {isLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <NotebookPen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-[14px] font-medium text-foreground">{notes.length === 0 ? "No notes yet" : "No notes match"}</p>
                <p className="text-[13px] mt-1">{notes.length === 0 ? "Create your first note to get started" : "Try a different search or tag"}</p>
              </div>
            ) : filteredNotes.map((note) => {
              const isSelected = note.id === selectedNote?.id;
              const tags = extractTags(note);
              const wordCount = countWords(note.content);
              return (
                <button key={note.id} onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full rounded-xl border p-3.5 text-left transition-all ${isSelected
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border bg-white hover:border-primary/20 hover:shadow-sm"}`}>
                  <div className="font-semibold text-[13px] line-clamp-1 text-foreground">{note.title.trim() || "Untitled note"}</div>
                  <p className="mt-1.5 text-[12px] text-muted-foreground line-clamp-2">{notePreview(note)}</p>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-[11px] text-muted-foreground">{format(new Date(note.updatedAt), "MMM d, yyyy")}</span>
                    <span className="text-[11px] text-muted-foreground">{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
                  </div>
                  {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-primary font-medium">#{tag}</span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel: editor */}
        <div className="flex flex-col gap-3">
          {selectedNote ? (
            <>
              {/* Title row */}
              <div className="flex items-center gap-3">
                <Input
                  value={draftTitle}
                  onChange={(e) => persist({ title: e.target.value })}
                  placeholder="Note title…"
                  className="text-[18px] font-bold border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 bg-transparent h-auto pb-2 flex-1"
                />
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[12px] font-medium transition-colors ${lastSaved === "saving" ? "text-amber-500" : lastSaved === "saved" ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {lastSaved === "saving" ? "Saving…" : lastSaved === "saved" ? "✓ Saved" : "Ready"}
                  </span>
                  <button
                    onClick={() => { if (confirm("Delete this note?")) deleteNote.mutate(selectedNote.id); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quick tag insert */}
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[12px] text-muted-foreground font-medium">Quick tags:</span>
                {QUICK_TAGS.map((tag) => (
                  <button key={tag}
                    onClick={() => persist({ content: `${draftContent}${draftContent.trim() ? "" : ""}<p>#${tag}</p>` })}
                    className="text-[12px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground hover:bg-accent hover:text-primary transition-colors font-medium">
                    #{tag}
                  </button>
                ))}
              </div>

              {/* Rich text editor */}
              <NoteEditor
                key={selectedNote.id}
                content={draftContent}
                onChange={(html) => persist({ content: html })}
                placeholder="Start writing… use #tags to organize, or use the toolbar for formatting"
              />

              {/* Footer */}
              <div className="flex items-center justify-between text-[12px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Updated {formatDistanceToNow(new Date(selectedNote.updatedAt), { addSuffix: true })}
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <AlignLeft className="h-3.5 w-3.5" />
                    {countWords(draftContent)} words
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    {extractTags(selectedNote).length} tags
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-secondary/20">
              <NotebookPen className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-[16px] font-semibold text-foreground mb-1.5">No note selected</p>
              <p className="text-[14px] mb-5">Create a new note or select one from the list.</p>
              <Button onClick={() => createNote.mutate({ title: "", content: "" })} className="gap-2 text-[14px]">
                <Plus className="h-4 w-4" />Create your first note
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
