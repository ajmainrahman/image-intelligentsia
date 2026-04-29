// ============================================================
// FILE: artifacts/career-hub/src/pages/weekly-review.tsx (NEW)
// ============================================================
// Route: /weekly-review
// Add to App.tsx: <Route path="/weekly-review" component={WeeklyReviewPage} />
// ============================================================

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, BookOpen, Target } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

async function fetchWeeklyReview(userId: number, offset: number) {
  const res = await fetch(`/api/weekly-review?userId=${userId}&offset=${offset}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function saveNotes(reviewId: number, notes: string) {
  const res = await fetch(`/api/weekly-review/${reviewId}/notes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

export default function WeeklyReviewPage() {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["weekly-review", user?.id, offset],
    queryFn: () => fetchWeeklyReview(user!.id, offset),
    enabled: !!user,
    onSuccess: (d) => setNotes(d.review?.notes ?? ""),
  });

  const saveNotesMutation = useMutation({
    mutationFn: () => saveNotes(data!.review.id, notes),
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

  if (!user) return <div className="p-6 text-slate-400">Please sign in.</div>;
  if (isLoading)
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>;

  const { review, entries, goals: weekGoals } = data ?? { review: null, entries: [], goals: [] };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Button>
      </Link>

      {/* Header + nav */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly Review</h1>
          <p className="text-slate-400 text-sm mt-0.5">{weekLabel()}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOffset((o) => o + 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(0)}
          >
            This Week
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            <Clock className="w-5 h-5 mx-auto text-blue-400 mb-1" />
            <div className="text-2xl font-bold text-slate-800">
              {review?.hoursLogged ?? 0}h
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Hours Logged</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            <BookOpen className="w-5 h-5 mx-auto text-purple-400 mb-1" />
            <div className="text-2xl font-bold text-slate-800">
              {review?.entriesCompleted ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Entries</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-5 pb-4">
            <Target className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
            <div className="text-2xl font-bold text-slate-800">
              {review?.goalsProgressed ?? 0}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Goals Updated</div>
          </CardContent>
        </Card>
      </div>

      {/* Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learning This Week</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 && (
            <p className="text-slate-400 text-sm">No entries this week.</p>
          )}
          {entries.map((e: any) => (
            <div key={e.id} className="flex justify-between items-start border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{e.title}</p>
                {e.skills?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {e.skills.map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs px-1.5 py-0">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>
              {e.hoursSpent != null && (
                <span className="text-xs text-slate-400 ml-3">{e.hoursSpent}h</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Goals progressed */}
      {weekGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goals Updated This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weekGoals.map((g: any) => (
              <div key={g.id} className="flex justify-between items-center border rounded-lg p-3">
                <p className="text-sm font-medium text-slate-800">{g.title}</p>
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
                <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => saveNotesMutation.mutate()} disabled={saveNotesMutation.isPending}>
                  Save
                </Button>
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
            <p className="text-sm text-slate-600">
              {review?.notes || <span className="text-slate-400 italic">No notes yet.</span>}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
