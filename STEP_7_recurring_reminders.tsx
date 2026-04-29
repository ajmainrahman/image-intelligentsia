// ============================================================
// FILE: artifacts/career-hub/src/components/recurring-reminder.tsx (NEW)
// ============================================================
// 1) Add <RecurrenceSelector> to your existing reminder create/edit form
// 2) Replace your "complete reminder" API call with the new route
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

// ── 1. RecurrenceSelector — drop into your reminder form ────
interface RecurrenceSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm flex items-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
        Recurrence
      </Label>
      <Select
        value={value ?? "none"}
        onValueChange={(v) => onChange(v === "none" ? null : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No recurrence" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None (one-time)</SelectItem>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// ── 2. RecurrenceBadge — show on reminder cards ─────────────
export function RecurrenceBadge({
  recurrence,
  count,
}: {
  recurrence: string | null;
  count?: number;
}) {
  if (!recurrence) return null;
  const labels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  };
  return (
    <Badge
      variant="outline"
      className="text-xs gap-1 text-blue-600 border-blue-200"
    >
      <RefreshCw className="w-3 h-3" />
      {labels[recurrence]}
      {count != null && count > 0 ? ` ×${count}` : ""}
    </Badge>
  );
}

// ── 3. useCompleteReminder hook ──────────────────────────────
// Replace your existing complete-reminder mutation with this:
//
// const completeReminder = useCompleteReminder();
// completeReminder.mutate(reminderId);
//
// It calls the new /api/reminders/:id/complete route which
// auto-creates the next recurrence if set.

async function completeReminderApi(id: number) {
  const res = await fetch(`/api/reminders/${id}/complete`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to complete reminder");
  return res.json();
}

export function useCompleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completeReminderApi,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["due-warnings"] });
      if (data.nextReminder) {
        // Optionally show a toast: "Next reminder scheduled for X"
        console.log("Next reminder created:", data.nextReminder);
      }
    },
  });
}

// ── 4. How to add recurrence to your reminder create form ───
//
// In your reminder form schema (Zod), add:
//   recurrence: z.enum(["daily","weekly","monthly"]).nullable().optional()
//
// In your form JSX, add the component:
//   <RecurrenceSelector
//     value={form.watch("recurrence") ?? null}
//     onChange={(v) => form.setValue("recurrence", v)}
//   />
//
// In your POST /api/reminders body, include:
//   recurrence: formData.recurrence ?? null
//
// The existing reminders API route already stores it once
// the DB schema column is added (see STEP_1).
