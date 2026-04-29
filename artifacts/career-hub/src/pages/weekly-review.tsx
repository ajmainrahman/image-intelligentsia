import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, BookOpen, Target } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

const serif = { fontFamily: "'DM Serif Display', serif", fontWeight: 400 };

export default function WeeklyReviewPage() {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["weekly-review", offset],
    queryFn: () => api<any>(`/weekly-review?offset=${offset}`),
    enabled: !!user,
    onSuccess: (d: any) => setNotes(d.review?.notes ?? ""),
  } as any);

  const saveNotesMutation = useMutation({
    mutationFn: () =>
      api(`/weekly-review/${data!.review.id}/notes`, { method: "PUT", body: JSON.stringify({ notes }) }),
    onSuccess: () => {
      setEditingNotes(false);
      qc.invalidateQueries({ queryKey: ["weekly-review"] });
    },
  });

  const weekLabel = () => {
    const ref = addDays(new Date(), -7 * offset);
    const ws = startOfWeek(ref);
    const we = endOfWeek(ref);
    return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
  };

  if (!user) return <div className="p-6 text-muted-foreground">Please sign in.</div>;

  const { review, entries = [], goals: weekGoals = [] } = data ?? {};

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 page-enter">
      <Link href="/">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] text-foreground leading-tight" style={serif}>Weekly Review</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{weekLabel()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setOffset((o) => o + 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(0)}>
            This Week
          </Button>
          <Button variant="outline" size="icon" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center">
            <CardContent className="pt-5 pb-4">
              <Clock className="w-5 h-5 mx-auto text-blue-400 mb-1" />
              <div className="text-2xl font-bold">{review?.hoursLogged ?? 0}h</div>
              <div className="text-xs text-muted-foreground mt-0.5">Hours Logged</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-5 pb-4">
              <BookOpen className="w-5 h-5 mx-auto text-purple-400 mb-1" />
              <div className="text-2xl font-bold">{review?.entriesCompleted ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Entries</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-5 pb-4">
              <Target className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
              <div className="text-2xl font-bold">{review?.goalsProgressed ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Goals Updated</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Learning entries */}
      <Card>
        <CardHeader><CardTitle className="text-base">Learning This Week</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? <Skeleton className="h-16 w-full" /> : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No entries this week.</p>
          ) : entries.map((e: any) => (
            <div key={e.id} className="flex justify-between items-start border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">{e.title}</p>
                <span className="text-xs text-muted-foreground capitalize">{e.category}</span>
              </div>
              {e.durationHours != null && Number(e.durationHours) > 0 && (
                <span className="text-xs text-muted-foreground ml-3">{Number(e.durationHours)}h</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Goals updated */}
      {weekGoals.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Goals Updated This Week</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {weekGoals.map((g: any) => (
              <div key={g.id} className="flex justify-between items-center border rounded-lg p-3">
                <p className="text-sm font-medium">{g.title}</p>
                <Badge variant="outline">{g.status?.replace("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Week Notes</CardTitle>
            {!editingNotes ? (
              <Button size="sm" variant="outline" onClick={() => setEditingNotes(true)}>
                {review?.notes ? "Edit" : "Add Notes"}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>Cancel</Button>
                <Button size="sm" onClick={() => saveNotesMutation.mutate()} disabled={saveNotesMutation.isPending}>Save</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What went well? What would you do differently?"
              rows={4}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {review?.notes || <span className="italic">No notes yet.</span>}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
