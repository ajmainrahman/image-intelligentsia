// ============================================================
// FILE: artifacts/career-hub/src/components/due-warning-banner.tsx (NEW)
// ============================================================
// Import and place near the top of your dashboard page:
//   <DueWarningBanner userId={user.id} />
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

async function fetchDueWarnings(userId: number) {
  const res = await fetch(`/api/due-warnings?userId=${userId}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export function DueWarningBanner({ userId }: { userId: number }) {
  const { data } = useQuery({
    queryKey: ["due-warnings", userId],
    queryFn: () => fetchDueWarnings(userId),
    refetchInterval: 5 * 60 * 1000,
  });

  if (!data) return null;

  const { overdueReminders, soonReminders, overdueGoals, soonGoals } = data;
  const overdueCount = overdueReminders.length + overdueGoals.length;
  const soonCount = soonReminders.length + soonGoals.length;

  if (overdueCount === 0 && soonCount === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">
              {overdueCount} item{overdueCount > 1 ? "s" : ""} overdue
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {overdueReminders.map((r: any) => (
                <Link href="/reminders" key={r.id}>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-200">
                    ⏰ {r.title}
                  </span>
                </Link>
              ))}
              {overdueGoals.map((g: any) => (
                <Link href={`/goals/${g.id}`} key={g.id}>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-200">
                    🎯 {g.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {soonCount > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-700">
              {soonCount} item{soonCount > 1 ? "s" : ""} due in the next 7 days
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {soonReminders.map((r: any) => (
                <Link href="/reminders" key={r.id}>
                  <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-200">
                    ⏰ {r.title}
                    {r.dueDate ? ` · ${format(new Date(r.dueDate), "MMM d")}` : ""}
                  </span>
                </Link>
              ))}
              {soonGoals.map((g: any) => (
                <Link href={`/goals/${g.id}`} key={g.id}>
                  <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-200">
                    🎯 {g.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================
// FILE: artifacts/career-hub/src/components/skills-gap-card.tsx (NEW)
// ============================================================
// Add to your dashboard page:
//   <SkillsGapCard userId={user.id} />
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

async function fetchSkillsGap(userId: number) {
  const res = await fetch(`/api/skills-gap?userId=${userId}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export function SkillsGapCard({ userId }: { userId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["skills-gap", userId],
    queryFn: () => fetchSkillsGap(userId),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading || !data) return null;
  if (data.goalSkills.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="w-4 h-4 text-yellow-500" />
          Skills Gap Analysis
        </CardTitle>
        <div className="space-y-1 mt-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Coverage</span>
            <span>
              {data.covered.length}/{data.goalSkills.length} skills
            </span>
          </div>
          <Progress value={data.coveragePercent} className="h-1.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.gaps.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1.5">
              Missing Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.gaps.map((s: string) => (
                <Badge
                  key={s}
                  className="bg-red-50 text-red-600 border border-red-200 text-xs"
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {data.covered.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-1.5">
              Covered Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.covered.map((s: string) => (
                <Badge
                  key={s}
                  className="bg-green-50 text-green-700 border border-green-200 text-xs"
                >
                  ✓ {s}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
