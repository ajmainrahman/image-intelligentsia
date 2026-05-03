import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, NotebookPen, Plus, Save, Trash2, Search, Hash, Sparkles, ArrowUpDown, Lightbulb, Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered, CheckSquare, Link as LinkIcon } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import LinkExt from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

const PROMPTS = ["What progress did you make today?", "What did you learn from your latest reading?", "What should you focus on next?", "What felt difficult and why?", "What would make this week a win?"];
const QUICK_TAGS = ["planning", "research", "building", "reflection", "design", "writing", "feedback", "milestone", "problem", "win"];

type Note = { id: number; title: string; content: string; createdAt: string; updatedAt: string };
type InterviewQuestion = { id: number; userId: number; question: string; answer: string | null; category: string | null; createdAt: string };

function countWords(content: string): number { const plain = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); return plain ? plain.split(" ").filter(Boolean).length : 0; }
function extractTagsFromHtml(html: string): string[] { const text = html.replace(/<[^>]*>/g, " "); return [...new Set((text.match(/#[\w-]+/g) ?? []).map((t) => t.slice(1).toLowerCase()))]; }
function notePreview(note: Note): string { const plain = note.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); return plain.slice(0, 120) || "No content yet."; }
function extractTags(note: Note): string[] { return [...new Set([...(note.title.match(/#[\w-]+/g) ?? []), ...extractTagsFromHtml(note.content)].map((t) => t.slice(1).toLowerCase()))]; }
function sortNotes(notes: Note[]) { return [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); }

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => <button type="button" title={title} onClick={onClick} className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors ${active ? "bg-primary/15 text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>{icon}</button>;
  const handleLink = () => { const prev = editor.getAttributes("link").href as string | undefined; const url = window.prompt("Enter URL", prev ?? "https://"); if (url === null) return; if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run(); else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run(); };
  return <div className="flex items-center gap-0.5 flex-wrap border-b border-border/60 pb-2 mb-1">{btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-3.5 w-3.5" />, "Bold")}{btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-3.5 w-3.5" />, "Italic")}{btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <Underline className="h-3.5 w-3.5" />, "Underline")}<div className="w-px h-5 bg-border/60 mx-1" />{btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-3.5 w-3.5" />, "Heading 2")}{btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-3.5 w-3.5" />, "Heading 3")}<div className="w-px h-5 bg-border/60 mx-1" />{btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-3.5 w-3.5" />, "Bullet List")}{btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3.5 w-3.5" />, "Numbered List")}{btn(editor.isActive("taskList"), () => editor.chain().focus().toggleTaskList().run(), <CheckSquare className="h-3.5 w-3.5" />, "Checklist")}<div className="w-px h-5 bg-border/60 mx-1" />{btn(editor.isActive("link"), handleLink, <LinkIcon className="h-3.5 w-3.5" />, "Link")}</div>;
}

function NoteEditor({ content, onChange, placeholder }: { content: string; onChange: (html: string) => void; placeholder: string }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), UnderlineExt, TaskList, TaskItem.configure({ nested: true }), LinkExt.configure({ openOnClick: false }), Placeholder.configure({ placeholder })],
    content,
    onUpdate({ editor }) { onChange(editor.getHTML()); },
    editorProps: { attributes: { class: "min-h-[420px] px-1 py-2 text-[15px] leading-7 text-foreground outline-none prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-slate-800 prose-h2:text-xl prose-h3:text-base prose-ul:my-1 prose-li:my-0.5 prose-ol:my-1 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]>label]:flex [&_li[data-type=taskItem]>label]:items-center [&_li[data-type=taskItem]>label]:mt-1 [&_li[data-type=taskItem]>label>input]:mr-2 [&_li[data-type=taskItem]>label>input]:h-4 [&_li[data-type=taskItem]>label>input]:w-4" } },
  });
  useEffect(() => { if (editor) editor.commands.setContent(content, false); }, [editor, content]);
  return <div className="rounded-xl border border-border bg-background"><div className="px-4 pt-3"><Toolbar editor={editor} /></div><div className="px-4 pb-4"><EditorContent editor={editor} /></div></div>;
}

export default function NotepadPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"recent" | "alpha">("recent");
  const [lastSaved, setLastSaved] = useState("Ready");
  const [legacySeeded, setLegacySeeded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const saveTimer = useRef<number | null>(null);

  const { data: notes = [], isLoading } = useQuery<Note[]>({ queryKey: ["notes"], queryFn: () => api<Note[]>("/notes") });
  const { data: interviewQuestions = [] } = useQuery<InterviewQuestion[]>({
    queryKey: ["interview-questions", user?.id],
    queryFn: () => api<InterviewQuestion[]>("/interview-questions"),
    enabled: Boolean(user?.id),
  });
  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedNoteId) ?? notes[0], [notes, selectedNoteId]);

  useEffect(() => { if (!selectedNote) return; setDraftTitle(selectedNote.title); setDraftContent(selectedNote.content); }, [selectedNote?.id]);
  useEffect(() => { if (selectedNoteId == null && notes[0]?.id) setSelectedNoteId(notes[0].id); }, [notes, selectedNoteId]);

  const createNote = useMutation({ mutationFn: (data: { title: string; content: string }) => api<Note>("/notes", { method: "POST", body: JSON.stringify(data) }), onSuccess: (note) => { setSelectedNoteId(note.id); setLastSaved("Saved"); queryClient.invalidateQueries({ queryKey: ["notes"] }); } });
  const updateNote = useMutation({ mutationFn: ({ id, data }: { id: number; data: { title: string; content: string } }) => api<Note>(`/notes/${id}`, { method: "PUT", body: JSON.stringify(data) }), onSuccess: () => { setLastSaved("Saved"); queryClient.invalidateQueries({ queryKey: ["notes"] }); } });
  const deleteNote = useMutation({ mutationFn: (id: number) => api(`/notes/${id}`, { method: "DELETE" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }) });
  const createInterviewQuestion = useMutation({ mutationFn: (data: { question: string; answer: string | null; category: string | null }) => api<InterviewQuestion>("/interview-questions", { method: "POST", body: JSON.stringify(data) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["interview-questions"] }) });
  const deleteInterviewQuestion = useMutation({ mutationFn: (id: number) => api(`/interview-questions/${id}`, { method: "DELETE" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["interview-questions"] }) });

  const persist = useCallback((updates: { title?: string; content?: string }) => { setLastSaved("Saving..."); const nextTitle = updates.title ?? draftTitle; const nextContent = updates.content ?? draftContent; if (updates.title !== undefined) setDraftTitle(nextTitle); if (updates.content !== undefined) setDraftContent(nextContent); if (!selectedNote) return; if (saveTimer.current) window.clearTimeout(saveTimer.current); saveTimer.current = window.setTimeout(() => updateNote.mutate({ id: selectedNote.id, data: { title: nextTitle, content: nextContent } }), 600); }, [draftTitle, draftContent, selectedNote]);

  const allTags = useMemo(() => { const tags = new Set<string>(); notes.forEach((n) => extractTags(n).forEach((t) => tags.add(t))); return [...tags].sort(); }, [notes]);
  const filteredNotes = useMemo(() => { const q = search.trim().toLowerCase(); const base = notes.filter((n) => { const tags = extractTags(n); const plain = n.content.replace(/<[^>]*>/g, " "); return (!q || n.title.toLowerCase().includes(q) || plain.toLowerCase().includes(q) || tags.some((t) => t.includes(q))) && (tagFilter === "all" || tags.includes(tagFilter)); }); return sortMode === "alpha" ? [...base].sort((a, b) => a.title.localeCompare(b.title)) : sortNotes(base); }, [notes, search, tagFilter, sortMode]);
  const addNote = () => createNote.mutate({ title: "", content: "" });
  const toggleDelete = () => { if (!selectedNote) return; if (confirm("Delete this note?")) deleteNote.mutate(selectedNote.id); };
  const insertTag = (tag: string) => persist({ content: `${draftContent}${draftContent.trim() ? "<br>" : ""}<p>#${tag}</p>` });
  const prompt = selectedNote ? PROMPTS[selectedNote.id % PROMPTS.length] : "";
  const questionCount = interviewQuestions.length;

  return <div className="space-y-8 page-enter max-w-6xl mx-auto"><div className="flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Notepad</h1><p className="text-muted-foreground mt-1">Write quick thoughts, interview notes, and ideas in one calm place. {questionCount} interview questions saved.</p></div><Button onClick={addNote} className="gap-2"><Plus className="h-4 w-4" />New Note</Button></div><div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6"><Card className="border-primary/15 bg-card/95 shadow-sm h-fit"><CardHeader><div className="space-y-3"><CardTitle className="flex items-center gap-2 text-base"><NotebookPen className="h-4 w-4 text-primary" />Notes</CardTitle><div className="space-y-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes" className="pl-9" /></div><div className="flex items-center gap-2"><Button type="button" variant={tagFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTagFilter("all")}>All</Button><Button type="button" variant="outline" size="sm" onClick={() => setSortMode((m) => (m === "recent" ? "alpha" : "recent"))}><ArrowUpDown className="h-4 w-4" />{sortMode === "recent" ? "Recent" : "A-Z"}</Button></div>{allTags.length > 0 && <div className="flex flex-wrap gap-1.5">{allTags.slice(0, 8).map((tag) => <Button key={tag} type="button" variant={tagFilter === tag ? "default" : "outline"} size="sm" onClick={() => setTagFilter(tagFilter === tag ? "all" : tag)} className="gap-1 h-7 text-xs"><Hash className="h-3 w-3" />{tag}</Button>)}</div>}</div></div></CardHeader><CardContent className="space-y-2">{isLoading ? <p className="text-sm text-muted-foreground">Loading notes…</p> : filteredNotes.map((note) => { const isSelected = note.id === selectedNote?.id; const tags = extractTags(note); return <button key={note.id} onClick={() => setSelectedNoteId(note.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${isSelected ? "border-primary/40 bg-primary/10" : "border-border bg-background/50 hover:border-primary/20"}`}><div className="font-medium line-clamp-1">{note.title.trim() || "Untitled note"}</div><div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{new Date(note.updatedAt).toLocaleDateString()}</span><span>{countWords(note.content)} words</span></div><p className="mt-2 text-xs text-muted-foreground line-clamp-2">{notePreview(note)}</p>{tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{tags.slice(0, 3).map((tag) => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">#{tag}</span>)}</div>}</button>})}</CardContent></Card><Card className="border-primary/15 bg-card/95 shadow-sm"><CardHeader className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><NotebookPen className="h-5 w-5 text-primary" /><CardTitle>{selectedNote?.title.trim() || "Untitled note"}</CardTitle></div><div className="flex items-center gap-3 text-xs text-muted-foreground"><Badge variant="secondary" className="gap-1"><CalendarDays className="h-3.5 w-3.5" />{selectedNote ? new Date(selectedNote.updatedAt).toLocaleDateString() : ""}</Badge><Badge variant="outline">{selectedNote ? countWords(selectedNote.content) : 0} words</Badge><span className="flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />{lastSaved}</span></div></div><Separator /></CardHeader>{selectedNote ? <CardContent className="space-y-4"><div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 flex items-start justify-between gap-3"><button type="button" onClick={() => setShowPrompt((v) => !v)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"><Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />{showPrompt ? prompt : "Need inspiration? See today's prompt"}</button><Popover><PopoverTrigger asChild><Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0"><Sparkles className="h-3.5 w-3.5" />Quick tags</Button></PopoverTrigger><PopoverContent className="w-72"><p className="text-sm font-medium mb-2">Insert a tag</p><div className="flex flex-wrap gap-2">{QUICK_TAGS.map((tag) => <Button key={tag} type="button" variant="outline" size="sm" onClick={() => insertTag(tag)} className="h-7 rounded-full text-xs">+{tag}</Button>)}</div></PopoverContent></Popover></div><div className="flex gap-3"><Input value={draftTitle} onChange={(e) => persist({ title: e.target.value })} placeholder="Note title" className="bg-background/70 flex-1" /><Button type="button" variant="outline" onClick={toggleDelete}><Trash2 className="h-4 w-4" /></Button></div><NoteEditor key={selectedNote.id} content={draftContent} onChange={(html) => persist({ content: html })} placeholder="Write your thoughts here…" /></CardContent> : <CardContent><div className="py-16 text-center"><NotebookPen className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground text-sm">No note selected.</p><Button onClick={addNote} className="mt-4 gap-2" variant="outline"><Plus className="h-4 w-4" /> Create a note</Button></div></CardContent>}</Card></div></div>;
}
