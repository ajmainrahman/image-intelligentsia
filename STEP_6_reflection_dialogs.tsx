// ============================================================
// FILE: artifacts/career-hub/src/components/milestone-complete-dialog.tsx (NEW)
// ============================================================
// Usage: When user clicks "Mark Complete" on a roadmap item,
// show this dialog instead of directly completing.
//
// Example in roadmap page:
//   const [completingId, setCompletingId] = useState<number|null>(null);
//   <MilestoneCompleteDialog
//     milestoneId={completingId}
//     milestoneTitle={selectedMilestone?.title}
//     open={completingId != null}
//     onOpenChange={(o) => !o && setCompletingId(null)}
//     onDone={() => queryClient.invalidateQueries({queryKey:['roadmap']})}
//   />
// ============================================================

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

async function completeMilestone(id: number, reflection: string) {
  const res = await fetch(`/api/roadmap/${id}/complete`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reflection }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

interface Props {
  milestoneId: number | null;
  milestoneTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function MilestoneCompleteDialog({
  milestoneId,
  milestoneTitle,
  open,
  onOpenChange,
  onDone,
}: Props) {
  const [reflection, setReflection] = useState("");

  const mutation = useMutation({
    mutationFn: () => completeMilestone(milestoneId!, reflection),
    onSuccess: () => {
      setReflection("");
      onOpenChange(false);
      onDone();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Complete Milestone
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {milestoneTitle && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              "{milestoneTitle}"
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="reflection" className="text-sm">
              Reflection <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="reflection"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What did you learn? Any challenges? What's next?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {mutation.isPending ? "Saving…" : "Mark Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ============================================================
// FILE: artifacts/career-hub/src/components/goal-achieve-dialog.tsx (NEW)
// ============================================================
// Usage: When user marks a Goal as "Achieved", show this dialog.
//
// Example in goals page:
//   const [achievingId, setAchievingId] = useState<number|null>(null);
//   <GoalAchieveDialog
//     goalId={achievingId}
//     goalTitle={selectedGoal?.title}
//     open={achievingId != null}
//     onOpenChange={(o) => !o && setAchievingId(null)}
//     onDone={() => queryClient.invalidateQueries({queryKey:['goals']})}
//   />
// ============================================================

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, BookOpen, Map } from "lucide-react";

async function achieveGoal(id: number, reflection: string) {
  const res = await fetch(`/api/goals/${id}/achieve`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reflection }),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

interface GoalAchieveProps {
  goalId: number | null;
  goalTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function GoalAchieveDialog({
  goalId,
  goalTitle,
  open,
  onOpenChange,
  onDone,
}: GoalAchieveProps) {
  const [reflection, setReflection] = useState("");
  const [summary, setSummary] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: () => achieveGoal(goalId!, reflection),
    onSuccess: (data) => {
      setSummary(data);
    },
  });

  function handleClose() {
    setReflection("");
    setSummary(null);
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={summary ? handleClose : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {!summary ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                🎉 Mark Goal as Achieved!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {goalTitle && (
                <p className="text-sm text-slate-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">
                  "{goalTitle}"
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="goalReflection" className="text-sm">
                  Retrospective Note{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="goalReflection"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="What did achieving this goal mean? What did you learn along the way?"
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                {mutation.isPending ? "Saving…" : "Mark Achieved 🏆"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Goal Achieved! 🎊
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-600 font-medium">
                "{summary.goal.title}"
              </p>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <Clock className="w-4 h-4 mx-auto text-blue-400 mb-0.5" />
                  <div className="text-lg font-bold text-blue-700">
                    {summary.summary.totalHours}h
                  </div>
                  <div className="text-xs text-blue-400">logged</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <BookOpen className="w-4 h-4 mx-auto text-purple-400 mb-0.5" />
                  <div className="text-lg font-bold text-purple-700">
                    {summary.summary.entriesCount}
                  </div>
                  <div className="text-xs text-purple-400">entries</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <Map className="w-4 h-4 mx-auto text-emerald-400 mb-0.5" />
                  <div className="text-lg font-bold text-emerald-700">
                    {summary.summary.milestonesCompleted}/
                    {summary.summary.milestonesTotal}
                  </div>
                  <div className="text-xs text-emerald-400">milestones</div>
                </div>
              </div>

              {summary.goal.reflection && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-yellow-600 mb-1">
                    Your reflection
                  </p>
                  <p className="text-sm text-slate-700">
                    {summary.goal.reflection}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
