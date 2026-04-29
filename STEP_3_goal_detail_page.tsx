// ============================================================
// FILE: artifacts/career-hub/src/pages/goal-detail.tsx  (NEW)
// ============================================================
// Route: /goals/:id
// Add to your router in App.tsx:
//   <Route path="/goals/:id" component={GoalDetailPage} />
// ============================================================

import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, Map, Clock, Target, Trophy } from "lucide-react";
import { format } from "date-fns";

async function fetchGoalDetail(id: string) {
  const res = await fetch(`/api/goals/${id}/detail`);
  if (!res.ok) throw new Error("Failed to fetch goal detail");
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  achieved: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
};

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["goal-detail", id],
    queryFn: () => fetchGoalDetail(id!),
    enabled: !!id,
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading goal…
      </div>
    );
  if (isError || !data)
    return (
      <div className="p-6 text-red-500">Failed to load goal details.</div>
    );

  const { goal, learningEntries, milestones } = data;
  const completedMilestones = milestones.filter((m: any) => m.completed).length;
  const milestoneProgress =
    milestones.length > 0
      ? Math.round((completedMilestones / milestones.length) * 100)
      : 0;
  const totalHours = learningEntries.reduce(
    (sum: number, e: any) => sum + (e.hoursSpent ?? 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back */}
      <Link href="/goals">
        <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Back to Goals
        </Button>
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{goal.title}</h1>
          <Badge className={STATUS_COLORS[goal.status] ?? ""}>
            {goal.status?.replace("_", " ")}
          </Badge>
        </div>
        {goal.description && (
          <p className="text-slate-500">{goal.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
          {goal.targetRole && (
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> {goal.targetRole}
            </span>
          )}
          {goal.targetYear && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Target {goal.targetYear}
            </span>
          )}
          {goal.achievedAt && (
            <span className="flex items-center gap-1 text-green-600">
              <Trophy className="w-3.5 h-3.5" /> Achieved{" "}
              {format(new Date(goal.achievedAt), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      {/* Skills */}
      {goal.skills?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Target Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {goal.skills.map((s: string) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Reflection (if goal achieved) */}
      {goal.reflection && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">
              🎯 Retrospective Note
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-800 text-sm">{goal.reflection}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {learningEntries.length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Learning Entries</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {totalHours}h
            </div>
            <div className="text-xs text-slate-400 mt-1">Hours Logged</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">
              {completedMilestones}/{milestones.length}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Milestones Done
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Progress */}
      {milestones.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Milestone Progress</span>
            <span>{milestoneProgress}%</span>
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
            <p className="text-slate-400 text-sm">
              No learning entries linked yet.
            </p>
          )}
          {learningEntries.map((e: any) => (
            <div
              key={e.id}
              className="flex items-start justify-between border rounded-lg p-3"
            >
              <div>
                <p className="font-medium text-sm text-slate-800">{e.title}</p>
                {e.description && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {e.description}
                  </p>
                )}
                {e.skills?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {e.skills.map((s: string) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0 ml-3">
                {e.hoursSpent != null && (
                  <span className="text-xs text-slate-400">
                    {e.hoursSpent}h
                  </span>
                )}
                {e.createdAt && (
                  <p className="text-xs text-slate-300 mt-0.5">
                    {format(new Date(e.createdAt), "MMM d")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Roadmap Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="w-4 h-4 text-purple-500" />
            Roadmap Milestones ({milestones.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {milestones.length === 0 && (
            <p className="text-slate-400 text-sm">
              No milestones linked yet.
            </p>
          )}
          {milestones.map((m: any) => (
            <div
              key={m.id}
              className={`border rounded-lg p-3 ${
                m.completed ? "bg-green-50 border-green-200" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <p
                  className={`font-medium text-sm ${
                    m.completed
                      ? "line-through text-slate-400"
                      : "text-slate-800"
                  }`}
                >
                  {m.title}
                </p>
                {m.completed && (
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    Done
                  </Badge>
                )}
              </div>
              {m.description && (
                <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
              )}
              {m.reflection && (
                <p className="text-xs text-green-700 mt-1 italic">
                  💬 {m.reflection}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
