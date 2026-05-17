import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NotebookPen, Plus, Trash2, Search, Pencil, Bold, Italic, Underline as UnderlineIcon,
  Heading2, Heading3, List, ListOrdered, CheckSquare, Link as LinkIcon, Save,
  MessageSquare, ChevronDown, ChevronUp, Tag, FileText, Clock, Hash,
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

const CATEGORIES = ["Behavioral", "Technical", "System Design", "Company Culture", "Salary & Role", "Other"];

const CATEGORY_COLORS: Record<string, string> = {
  "Behavioral": "bg-purple-100 text-purple-700",
  "Technical": "bg-sky-100 text-sky-700",
  "System Design": "bg-amber-100 text-amber-700",
  "Company Culture": "bg-emerald-100 text-emerald-700",
  "Salary & Role": "bg-rose-100 text-rose-700",
  "Other": "bg-slate-100 text-slate-600",
};

const QUICK_TAGS = ["planning", "research", "reflection", "learning", "interview", "win", "problem"];

type Note = { id: number; title: string; content: string; createdAt: string; updatedAt: string };
type InterviewQuestion = { id: number; question: string; answer: string | null; category: string | null; createdAt: string };

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
  return plain.slice(0, 100) || "No content yet.";
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
    <button type="button" title={title} onClick={onClick}
      className={`h-7 w-7 inline-flex items-center justify-center rounded transition-colors ${active ? "bg-primary/15 text-primary" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
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
    <div className="flex items-center gap-0.5 flex-wrap border-b border-border pb-2 mb-2 px-3 pt-2">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-3.5 w-3.5" />, "Bold")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-3.5 w-3.5" />, "Italic")}
      {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="h-3.5 w-3.5" />, "Underline")}
      <div className="w-px h-4 bg-border mx-1" />
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-3.5 w-3.5" />, "Heading 2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-3.5 w-3.5" />, "Heading 3")}
      <div className="w-px h-4 bg-border mx-1" />
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-3.5 w-3.5" />, "Bullet List")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3.5 w-3.5" />, "Numbered List")}
      {btn(editor.isActive("taskList"), () => editor.chain().focus().toggleTaskList().run(), <CheckSquare className="h-3.5 w-3.5" />, "Checklist")}
      <div className="w-px h-4 bg-border mx-1" />
      {btn(editor.isActive("link"), handleLink, <LinkIcon className="h-3.5 w-3.5" />, "Link")}
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
        class: "min-h-[320px] px-3 py-2 text-[14px] leading-7 text-foreground outline-none prose prose-slate max-w-none prose-headings:font-semibold prose-h2:text-lg prose-h3:text-base prose-ul:my-1 prose-li:my-0.5 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]>label]:flex [&_li[data-type=taskItem]>label]:items-center [&_li[data-type=taskItem]>label]:mt-1 [&_li[data-type=taskItem]>label>input]:mr-2 [&_li[data-type=taskItem]>label>input]:h-4 [&_li[data-type=taskItem]>label>input]:w-4",
      },
    },
  });
  useEffect(() => { if (editor) editor.commands.setContent(content, false); }, [editor, content]);
  return (
    <div className="rounded-xl border border-border bg-background flex flex-col">
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
  const [activeTab, setActiveTab] = useState<"notes" | "interview">("notes");
  const [lastSaved, setLastSaved] = useState<"ready" | "saving" | "saved">("ready");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const saveTimer = useRef<number | null>(null);

  // Interview Q&A dialog state
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<number | null>(null);
  const [iqForm, setIqForm] = useState({ question: "", answer: "", category: "" });
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [interviewCategoryFilter, setInterviewCategoryFilter] = useState("all");

  const { data: notes = [], isLoading } = useQuery<Note[]>({ queryKey: ["notes"], queryFn: () => api<Note[]>("/notes") });
  const { data: interviewQuestions = [], isLoading: loadingIQ } = useQuery<InterviewQuestion[]>({
    queryKey: ["interview-questions"],
    queryFn: () => api<InterviewQuestion[]>("/interview-questions"),
  });

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

  const createInterview = useMutation({
    mutationFn: (data: { question: string; answer: string | null; category: string | null }) => api<InterviewQuestion>("/interview-questions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["interview-questions"] }); closeInterviewDialog(); toast({ title: "Question saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateInterview = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { question: string; answer: string | null; category: string | null } }) => api<InterviewQuestion>(`/interview-questions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["interview-questions"] }); closeInterviewDialog(); toast({ title: "Question updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteInterview = useMutation({
    mutationFn: (id: number) => api(`/interview-questions/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["interview-questions"] }); toast({ title: "Question deleted" }); },
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

  const filteredInterviews = useMemo(() => {
    return interviewCategoryFilter === "all"
      ? interviewQuestions
      : interviewQuestions.filter((q) => q.category === interviewCategoryFilter);
  }, [interviewQuestions, interviewCategoryFilter]);

  const openInterviewCreate = () => { setIqForm({ question: "", answer: "", category: "" }); setEditingInterviewId(null); setInterviewDialogOpen(true); };
  const openInterviewEdit = (item: InterviewQuestion) => { setIqForm({ question: item.question, answer: item.answer ?? "", category: item.category ?? "" }); setEditingInterviewId(item.id); setInterviewDialogOpen(true); };
  const closeInterviewDialog = () => { setInterviewDialogOpen(false); setEditingInterviewId(null); setIqForm({ question: "", answer: "", category: "" }); };

  const submitInterview = () => {
    if (!iqForm.question.trim()) { toast({ title: "Question is required", variant: "destructive" }); return; }
    const payload = { question: iqForm.question.trim(), answer: iqForm.answer.trim() || null, category: iqForm.category || null };
    if (editingInterviewId) updateInterview.mutate({ id: editingInterviewId, data: payload });
    else createInterview.mutate(payload);
  };

  const toggleExpand = (id: number) => setExpandedQuestions((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    interviewQuestions.forEach((q) => { const cat = q.category || "Other"; map.set(cat, (map.get(cat) ?? 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [interviewQuestions]);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-foreground leading-tight">Notepad</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Write notes, capture ideas, and track interview prep.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "notes" && (
            <Button onClick={() => createNote.mutate({ title: "", content: "" })} disabled={createNote.isPending} className="gap-2 text-[13px]">
              <Plus className="h-3.5 w-3.5" />New Note
            </Button>
          )}
          {activeTab === "interview" && (
            <Button onClick={openInterviewCreate} className="gap-2 text-[13px]">
              <Plus className="h-3.5 w-3.5" />Add Q&A
            </Button>
          )}
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg transition-colors ${activeTab === "notes" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <FileText className="h-3.5 w-3.5" />Notes
          <span className="text-[11px] bg-secondary text-muted-foreground rounded-full px-1.5 py-0.5">{notes.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("interview")}
          className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg transition-colors ${activeTab === "interview" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <MessageSquare className="h-3.5 w-3.5" />Interview Prep
          <span className="text-[11px] bg-secondary text-muted-foreground rounded-full px-1.5 py-0.5">{interviewQuestions.length}</span>
        </button>
      </div>

      {/* ——— NOTES TAB ——— */}
      {activeTab === "notes" && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 min-h-[600px]">
          {/* Left panel: list */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes…" className="pl-8 text-[13px] h-9" />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setTagFilter("all")} className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${tagFilter === "all" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>All</button>
                {allTags.slice(0, 8).map((tag) => (
                  <button key={tag} onClick={() => setTagFilter(tag === tagFilter ? "all" : tag)} className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${tagFilter === tag ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                    #{tag}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[560px] pr-1">
              {isLoading ? (
                [1,2,3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <NotebookPen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-[13px]">{notes.length === 0 ? "No notes yet" : "No notes match"}</p>
                </div>
              ) : filteredNotes.map((note) => {
                const isSelected = note.id === selectedNote?.id;
                const tags = extractTags(note);
                return (
                  <button key={note.id} onClick={() => setSelectedNoteId(note.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${isSelected ? "border-primary/40 bg-primary/8" : "border-border bg-card hover:border-primary/20 hover:bg-secondary/50"}`}>
                    <div className="font-medium text-[13px] line-clamp-1 text-foreground">{note.title.trim() || "Untitled note"}</div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">{format(new Date(note.updatedAt), "MMM d")}</span>
                      <span className="text-[11px] text-muted-foreground">{countWords(note.content)} words</span>
                    </div>
                    <p className="mt-1.5 text-[12px] text-muted-foreground line-clamp-2">{notePreview(note)}</p>
                    {tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag) => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-primary">#{tag}</span>)}
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
                <div className="flex items-center justify-between gap-3">
                  <Input
                    value={draftTitle}
                    onChange={(e) => persist({ title: e.target.value })}
                    placeholder="Note title…"
                    className="text-[16px] font-semibold border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 bg-transparent h-auto pb-2"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] ${lastSaved === "saving" ? "text-amber-500" : lastSaved === "saved" ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {lastSaved === "saving" ? "Saving…" : lastSaved === "saved" ? "Saved" : "Ready"}
                    </span>
                    <button onClick={() => { if (confirm("Delete this note?")) deleteNote.mutate(selectedNote.id); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick tag insert */}
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {QUICK_TAGS.map((tag) => (
                      <button key={tag} onClick={() => persist({ content: `${draftContent}${draftContent.trim() ? "" : ""}<p>#${tag}</p>` })}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground hover:bg-accent hover:text-primary transition-colors">
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                <NoteEditor
                  key={selectedNote.id}
                  content={draftContent}
                  onChange={(html) => persist({ content: html })}
                  placeholder="Start writing… use #tags to organize your notes"
                />

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Updated {formatDistanceToNow(new Date(selectedNote.updatedAt), { addSuffix: true })}</span>
                  <span>{countWords(draftContent)} words</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                <NotebookPen className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-[14px] font-medium text-foreground mb-1">No note selected</p>
                <p className="text-[13px] mb-4">Create a new note or select one from the list.</p>
                <Button onClick={() => createNote.mutate({ title: "", content: "" })} className="gap-2 text-[13px]">
                  <Plus className="h-3.5 w-3.5" />Create first note
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ——— INTERVIEW PREP TAB ——— */}
      {activeTab === "interview" && (
        <div className="space-y-5">
          {/* Stats row */}
          {categoryStats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Q&As</p>
                <p className="text-[28px] font-bold text-foreground mt-1">{interviewQuestions.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">With Answers</p>
                <p className="text-[28px] font-bold text-foreground mt-1">{interviewQuestions.filter((q) => q.answer).length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Categories</p>
                <p className="text-[28px] font-bold text-foreground mt-1">{categoryStats.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Unanswered</p>
                <p className="text-[28px] font-bold text-amber-600 mt-1">{interviewQuestions.filter((q) => !q.answer).length}</p>
              </div>
            </div>
          )}

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setInterviewCategoryFilter("all")}
              className={`text-[12px] px-3 py-1 rounded-full transition-colors ${interviewCategoryFilter === "all" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              All ({interviewQuestions.length})
            </button>
            {categoryStats.map(([cat, count]) => (
              <button key={cat} onClick={() => setInterviewCategoryFilter(cat === interviewCategoryFilter ? "all" : cat)}
                className={`text-[12px] px-3 py-1 rounded-full transition-colors ${interviewCategoryFilter === cat ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {cat} ({count})
              </button>
            ))}
          </div>

          {/* Q&A list */}
          {loadingIQ ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : filteredInterviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl">
              <MessageSquare className="h-10 w-10 mb-3 opacity-20 text-muted-foreground" />
              <p className="text-[14px] font-medium text-foreground mb-1">No interview questions yet</p>
              <p className="text-[13px] text-muted-foreground mb-4 max-w-xs">Add questions you expect in interviews and draft your answers.</p>
              <Button onClick={openInterviewCreate} className="gap-2 text-[13px]"><Plus className="h-3.5 w-3.5" />Add first question</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInterviews.map((item) => {
                const isExpanded = expandedQuestions.has(item.id);
                const catColor = CATEGORY_COLORS[item.category ?? ""] ?? CATEGORY_COLORS["Other"];
                return (
                  <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {item.category && (
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${catColor}`}>{item.category}</span>
                            )}
                            {item.answer ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Answered</span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Needs answer</span>
                            )}
                            <span className="text-[11px] text-muted-foreground">{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
                          </div>
                          <p className="text-[14px] font-medium text-foreground leading-snug">{item.question}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openInterviewEdit(item)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { if (confirm("Delete this question?")) deleteInterview.mutate(item.id); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                          {item.answer && (
                            <button onClick={() => toggleExpand(item.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {item.answer && isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-[12px] font-medium text-muted-foreground mb-1.5">Your answer:</p>
                          <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                        </div>
                      )}
                      {!item.answer && (
                        <button onClick={() => openInterviewEdit(item)} className="mt-2 text-[12px] text-primary hover:underline">
                          + Write your answer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Interview Q&A Dialog */}
      <Dialog open={interviewDialogOpen} onOpenChange={(v) => { if (!v) closeInterviewDialog(); }}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingInterviewId ? "Edit Question" : "Add Interview Q&A"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Question *</label>
              <Textarea
                value={iqForm.question}
                onChange={(e) => setIqForm((f) => ({ ...f, question: e.target.value }))}
                placeholder="e.g. Tell me about a time you handled conflict on a team…"
                className="min-h-[80px] resize-none text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Category</label>
              <Select value={iqForm.category || "none"} onValueChange={(v) => setIqForm((f) => ({ ...f, category: v === "none" ? "" : v }))}>
                <SelectTrigger className="text-[13px]"><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Your Answer / Notes</label>
              <Textarea
                value={iqForm.answer}
                onChange={(e) => setIqForm((f) => ({ ...f, answer: e.target.value }))}
                placeholder="Draft your answer. Use STAR framework: Situation → Task → Action → Result"
                className="min-h-[120px] resize-y text-[13px]"
              />
            </div>
            <div className="rounded-lg bg-secondary px-3 py-2.5 text-[12px] text-muted-foreground">
              <strong className="text-foreground">STAR tip:</strong> Situation → Task → Action → Result. Keep each section to 1–2 sentences.
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={closeInterviewDialog} className="text-[13px]">Cancel</Button>
            <Button onClick={submitInterview} disabled={createInterview.isPending || updateInterview.isPending} className="text-[13px]">
              {(createInterview.isPending || updateInterview.isPending) ? "Saving…" : "Save Q&A"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
