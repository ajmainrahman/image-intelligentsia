import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { NotebookPen, Save } from "lucide-react";

const NOTE_KEY = "image_intelligentsia_notepad";

export default function NotepadPage() {
  const [note, setNote] = useState(() => localStorage.getItem(NOTE_KEY) ?? "");
  const [lastSaved, setLastSaved] = useState("Ready");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem(NOTE_KEY, note);
      setLastSaved("Saved");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [note]);

  return (
    <div className="space-y-8 page-enter max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notepad</h1>
        <p className="text-muted-foreground mt-1">Write quick thoughts, interview notes, and ideas in one calm place.</p>
      </div>

      <Card className="border-primary/15 bg-card/95 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-primary" />
            <CardTitle>My Notes</CardTitle>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Save className="h-3.5 w-3.5" />
            {lastSaved}
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setLastSaved("Saving...");
            }}
            placeholder="Write anything you want to remember..."
            className="min-h-[520px] resize-none border-primary/10 bg-background/70 text-base leading-7"
          />
        </CardContent>
      </Card>
    </div>
  );
}