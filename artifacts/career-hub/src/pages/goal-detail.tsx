import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, Map, Clock, Target, Trophy, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const serif = { fontFamily: "'DM Serif Display', serif", fontWeight: 400 };

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-blue-100 text-blue-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  achieved:  "bg-green-100 text-green-700",
  paused:    "bg-yellow-100 text-yellow-700",
};

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reflection, setReflection] = useState("");
  const [showAchieveDialog, setShowAchieveDialog] = useState(false);
  const [achieveSummary, setAchieveSummary] = useState<any>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["goal-detail", id],
    queryFn: () => api<any>(`/goals/${id}/detail`),
    enabled: !!id,
  });

  const achieveMutation = useMutation({
    mutationFn: () =>
      api(`/goals/${id}/achieve`, { method: "PUT", body: JSON.stringify({ reflection }) }),
    onSuccess: (data) => {
      setAchieveSummary(data);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goal-detail", id] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading)
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  if (isError || !data)
    return <div className="p-6 text-red-500">Failed to load goal details.</div>;

  const { goal, learningEntries, milestones } = data;
  const completedMilestones = milestones.filter((m: any) => m.status === "completed").length;
  const milestoneProgress =
    milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;
  const totalHours = learningEntries.reduce(
    (sum: number, e: any) => sum + Number(e.durationHours ?? 0), 0
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 page-enter">
      <Link href="/goals">
        <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Back to Goals
        </Button>
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[28px] text-foreground leading-tight" style={serif}>{goal.title}</h1>
          <Badge className={STATUS_COLORS[goal.status] ?? ""}>
            {goal.status?.replace("_", " ")}
          </Badge>
        </div>
        {goal.description && <p className="text-muted-foreground">{goal.description}</p>}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {goal.targetRole && (
            <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {goal.targetRole}</span>
          )}
          {goal.targetYear && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Target {goal.targetYear}</span>
          )}
          {goal.achievedAt && (
            <span className="flex items-center gap-1 text-green-600">
              <Trophy className="w-3.5 h-3.5" /> Achieved {format(new Date(goal.achievedAt), "MMM d, yyyy")}
            </span>
          )}
        </div>
        {goal.status !== "completed" && (
          <Button
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-white gap-2"
            onClick={() => setShowAchieveDialog(true)}
          >
            <Trophy className="w-3.5 h-3.5" /> Mark as Achieved
          </Button>
        )}
      </div>

      {/* Skills */}
      {goal.skills?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Skills</p>
          <div className="flex flex-wrap gap-2">
            {goal.skills.map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)}
          </div>
        </div>
      )}

      {/* Reflection */}
      {goal.reflection && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">🎯 Retrospective Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-800 text-sm">{goal.reflection}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{learningEntries.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Learning Entries</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{totalHours}h</div>
            <div className="text-xs text-muted-foreground mt-1">Hours Logged</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">{completedMilestones}/{milestones.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Milestones Done</div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Progress */}
      {milestones.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Milestone Progress</span><span>{milestoneProgress}%</span>
          </div>
          <Progress value={milestoneProgress} className="h-2" />
        </div>
      )}

      {/* Learning Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4 text-blue-500" />
            Learning Entries ({learningEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {learningEntries.length === 0 && (
            <p className="text-muted-foreground text-sm">No learning entries linked yet.</p>
          )}
          {learningEntries.map((e: any) => (
            <div key={e.id} className="flex items-start justify-between border rounded-lg p-3">
              <div>
                <p className="font-medium text-sm">{e.title}</p>
                {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                <span className="text-xs text-muted-foreground capitalize">{e.category}</span>
              </div>
              <div className="text-right shrink-0 ml-3">
                {e.durationHours != null && Number(e.durationHours) > 0 && (
                  <span className="text-xs text-muted-foreground">{Number(e.durationHours)}h</span>
                )}
                {e.createdAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(e.createdAt), "MMM d")}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="w-4 h-4 text-purple-500" />
            Roadmap Milestones ({milestones.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {milestones.length === 0 && (
            <p className="text-muted-foreground text-sm">No milestones linked yet.</p>
          )}
          {milestones.map((m: any) => (
            <div key={m.id} className={`border rounded-lg p-3 ${m.status === "completed" ? "bg-green-50 border-green-200" : ""}`}>
              <div className="flex items-center justify-between">
                <p className={`font-medium text-sm ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                  {m.title}
                </p>
                {m.status === "completed" && (
                  <Badge className="bg-green-100 text-green-700 text-xs">Done</Badge>
                )}
              </div>
              {m.reflection && (
                <p className="text-xs text-green-700 mt-1 italic">💬 {m.reflection}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Achieve Dialog */}
      <Dialog open={showAchieveDialog} onOpenChange={(o) => { if (!o) { setShowAchieveDialog(false); setAchieveSummary(null); setReflection(""); } }}>
        <DialogContent className="sm:max-w-lg">
          {!achieveSummary ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" /> Mark Goal as Achieved 🎉
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">"{goal.title}"</p>
                <Textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="What did achieving this goal mean? What did you learn along the way?"
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowAchieveDialog(false)}>Cancel</Button>
                <Button onClick={() => achieveMutation.mutate()} disabled={achieveMutation.isPending} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                  {achieveMutation.isPending ? "Saving…" : "Mark Achieved 🏆"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" /> Goal Achieved! 🎊
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm font-medium">"{achieveSummary.goal.title}"</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <Clock className="w-4 h-4 mx-auto text-blue-400 mb-0.5" />
                    <div className="text-lg font-bold text-blue-700">{achieveSummary.summary.totalHours}h</div>
                    <div className="text-xs text-blue-400">logged</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <BookOpen className="w-4 h-4 mx-auto text-purple-400 mb-0.5" />
                    <div className="text-lg font-bold text-purple-700">{achieveSummary.summary.entriesCount}</div>
                    <div className="text-xs text-purple-400">entries</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <Map className="w-4 h-4 mx-auto text-emerald-400 mb-0.5" />
                    <div className="text-lg font-bold text-emerald-700">{achieveSummary.summary.milestonesCompleted}/{achieveSummary.summary.milestonesTotal}</div>
                    <div className="text-xs text-emerald-400">milestones</div>
                  </div>
                </div>
                {achieveSummary.goal.reflection && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-yellow-600 mb-1">Your reflection</p>
                    <p className="text-sm">{achieveSummary.goal.reflection}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => { setShowAchieveDialog(false); setAchieveSummary(null); setReflection(""); }} className="w-full">Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
