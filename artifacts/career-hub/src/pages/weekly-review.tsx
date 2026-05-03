import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Clock, Microscope, Target, CalendarDays } from "lucide-react";

type ReviewData = {
  review: {
    id: number;
    hoursLogged: number;
    entriesCompleted: number;
    goalsProgressed: number;
    notes?: string | null;
    weekStart: string;
    weekEnd: string;
  };
  entries: Array<{
    id: number;
    title: string;
    category?: string | null;
    durationHours?: string | number | null;
    createdAt?: string;
  }>;
  goals: Array<{
    id: number;
    title: string;
    status?: string | null;
    updatedAt?: string;
  }>;
};

function weekRangeLabel(offset: number) {
  const ref = addDays(new Date(), -7 * offset);
  const ws = startOfWeek(ref);
  const we = endOfWeek(ref);
  return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
}

function categoryLabel(value?: string | null) {
  if (!value) return "Update";
  return value.replace(/_/g, " ");
}

export default function WeeklyReviewPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["weekly-review", offset],
    queryFn: () => api<ReviewData>(`/weekly-review?offset=${offset}`),
    enabled: !!user,
    onSuccess: (next) => setNotes(next.review?.notes ?? ""),
  } as any);

  const saveNotes = useMutation({
    mutationFn: () => api(`/weekly-review/${data!.review.id}/notes`, {
      method: "PUT",
      body: JSON.stringify({ notes }),
    }),
    onSuccess: () => {
      setEditingNotes(false);
      qc.invalidateQueries({ queryKey: ["weekly-review"] });
    },
  });

  const { summaryText, totalHours, timeline } = useMemo(() => {
    const entries = data?.entries ?? [];
    const goals = data?.goals ?? [];
    const hours = Number(data?.review?.hoursLogged ?? 0);

    const researchCount = entries.filter((e) => {
      const text = `${e.category ?? ""} ${e.title}`.toLowerCase();
      return text.includes("research") || text.includes("paper") || text.includes("reading");
    }).length;
    const learningCount = entries.length;
    const goalCount = goals.length;

    const timelineItems = [
      ...entries.map((e) => ({
        kind: "learning" as const,
        title: e.title,
        detail: `${categoryLabel(e.category)}${e.durationHours ? ` · ${Number(e.durationHours)}h` : ""}`,
        date: e.createdAt,
      })),
      ...goals.map((g) => ({
        kind: "goal" as const,
        title: g.title,
        detail: `Goal ${g.status ?? "updated"}`,
        date: g.updatedAt,
      })),
    ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

    const summary =
      goalCount === 0 && learningCount === 0
        ? "No activity logged this week yet."
        : `You completed ${learningCount} learning update${learningCount === 1 ? "" : "s"}, ${goalCount} goal update${goalCount === 1 ? "" : "s"}, and ${researchCount} research-focused item${researchCount === 1 ? "" : "s"} for a total of ${hours} hours.`;

    return { summaryText: summary, totalHours: hours, timeline: timelineItems };
  }, [data]);

  if (!user) return <div className="p-6 text-muted-foreground">Please sign in.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 page-enter">
      <Link href="/">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Button>
      </Link>

      <div className="flex items-start justify-between gap-4 flex-col md:flex-row md:items-center">
        <div>
          <h1 className="text-[28px] font-bold text-foreground leading-tight">Weekly Review</h1>
          <p className="text-sm text-muted-foreground mt-1">{weekRangeLabel(offset)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setOffset((o) => o + 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(0)}>
            This week
          </Button>
          <Button variant="outline" size="icon" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="border-[#e4ddd2] bg-[#fdfcf8]">
        <CardContent className="p-5 md:p-6">
          {isLoading ? <Skeleton className="h-16 w-full rounded-2xl" /> : <p className="text-slate-700 text-[15px] leading-7">{summaryText}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <Card className="border-[#e4ddd2] bg-white shadow-sm">
              <CardContent className="p-5">
                <Clock className="h-5 w-5 text-emerald-600" />
                <div className="mt-3 text-3xl font-bold text-slate-800">{totalHours}h</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 mt-1">Time logged</div>
              </CardContent>
            </Card>
            <Card className="border-[#e4ddd2] bg-white shadow-sm">
              <CardContent className="p-5">
                <BookOpen className="h-5 w-5 text-sky-600" />
                <div className="mt-3 text-3xl font-bold text-slate-800">{data?.review?.entriesCompleted ?? 0}</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 mt-1">Learning entries</div>
              </CardContent>
            </Card>
            <Card className="border-[#e4ddd2] bg-white shadow-sm">
              <CardContent className="p-5">
                <Target className="h-5 w-5 text-amber-600" />
                <div className="mt-3 text-3xl font-bold text-slate-800">{data?.review?.goalsProgressed ?? 0}</div>
                <div className="text-xs uppercase tracking-wider text-slate-400 mt-1">Goals updated</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-[#e4ddd2] bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Timeline</CardTitle>
              <Badge variant="outline" className="gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Auto-summarized
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-40 w-full rounded-2xl" />
            ) : timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline items for this week.</p>
            ) : (
              timeline.map((item, index) => (
                <div key={`${item.kind}-${index}`} className="flex gap-3 rounded-2xl border border-[#efe8db] bg-[#fdfcf8] p-4">
                  <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${item.kind === "goal" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {item.kind === "goal" ? <Target className="h-4 w-4" /> : <Microscope className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {item.date ? format(new Date(item.date), "MMM d") : "Now"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{item.detail}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-[#e4ddd2] bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Week notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editingNotes ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                placeholder="What went well? What should you change next week?"
              />
            ) : (
              <p className="text-sm text-slate-600 whitespace-pre-wrap min-h-32">
                {data?.review?.notes || "No notes yet."}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              {editingNotes ? (
                <>
                  <Button variant="ghost" onClick={() => setEditingNotes(false)}>Cancel</Button>
                  <Button onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending || !data?.review?.id}>
                    Save notes
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditingNotes(true)}>
                  {data?.review?.notes ? "Edit notes" : "Add notes"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
