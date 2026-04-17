import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, NotebookPen, Plus, Save, Trash2 } from "lucide-react";

const NOTES_KEY = "image_intelligentsia_notes";
const LEGACY_NOTE_KEY = "image_intelligentsia_notepad";

type Note = {
  id: string;
  title: string;
  date: string;
  content: string;
  updatedAt: string;
};

function createNote(content = ""): Note {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    title: "",
    date: now.toISOString().slice(0, 10),
    content,
    updatedAt: now.toISOString(),
  };
}

function loadNotes(): Note[] {
  const savedNotes = localStorage.getItem(NOTES_KEY);
  if (savedNotes) {
    try {
      const parsed = JSON.parse(savedNotes);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      localStorage.removeItem(NOTES_KEY);
    }
  }

  const legacyNote = localStorage.getItem(LEGACY_NOTE_KEY);
  if (legacyNote) return [createNote(legacyNote)];
  return [createNote()];
}

function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

export default function NotepadPage() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [selectedNoteId, setSelectedNoteId] = useState(() => notes[0]?.id ?? "");
  const [lastSaved, setLastSaved] = useState("Ready");

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? notes[0],
    [notes, selectedNoteId],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      setLastSaved("Saved");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [notes]);

  const updateSelectedNote = (updates: Partial<Note>) => {
    if (!selectedNote) return;
    setLastSaved("Saving...");
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === selectedNote.id
          ? { ...note, ...updates, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
  };

  const addNote = () => {
    const note = createNote();
    setNotes((currentNotes) => [note, ...currentNotes]);
    setSelectedNoteId(note.id);
    setLastSaved("Saving...");
  };

  const deleteNote = (id: string) => {
    if (notes.length === 1) {
      setNotes([createNote()]);
      setLastSaved("Saving...");
      return;
    }

    const nextNotes = notes.filter((note) => note.id !== id);
    setNotes(nextNotes);
    if (selectedNoteId === id) setSelectedNoteId(nextNotes[0]?.id ?? "");
    setLastSaved("Saving...");
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <Card className="border-primary/15 bg-card/95 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <NotebookPen className="h-4 w-4 text-primary" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notes.map((note) => {
              const isSelected = note.id === selectedNote?.id;
              return (
                <button
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-background/50 hover:border-primary/20"
                  }`}
                >
                  <div className="font-medium line-clamp-1">
                    {note.title.trim() || "Untitled note"}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{new Date(note.date).toLocaleDateString()}</span>
                    <span>{countWords(note.content)} words</span>
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
              <Badge variant="secondary" className="gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {selectedNote ? new Date(selectedNote.date).toLocaleDateString() : ""}
              </Badge>
              <Badge variant="outline">{selectedNote ? countWords(selectedNote.content) : 0} words</Badge>
              <span className="flex items-center gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {lastSaved}
              </span>
            </div>
          </CardHeader>
          {selectedNote && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
                <Input
                  value={selectedNote.title}
                  onChange={(event) => updateSelectedNote({ title: event.target.value })}
                  placeholder="Note title"
                  className="bg-background/70"
                />
                <Input
                  type="date"
                  value={selectedNote.date}
                  onChange={(event) => updateSelectedNote({ date: event.target.value })}
                  className="bg-background/70"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (confirm("Delete this note?")) deleteNote(selectedNote.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={selectedNote.content}
                onChange={(event) => updateSelectedNote({ content: event.target.value })}
                placeholder="Write anything you want to remember..."
                className="min-h-[520px] resize-none border-primary/10 bg-background/70 text-base leading-7"
              />
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}