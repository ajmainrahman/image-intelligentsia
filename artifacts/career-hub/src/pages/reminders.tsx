import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing, Plus, Pencil, Trash2, Calendar, CheckCircle2, Circle, RefreshCw, AlertCircle, Clock, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Reminder = {
  id: number; title: string; description: string | null; dueDate: string | null;
  priority: string; completed: boolean; category: string;
  recurrence: string | null; recurrenceCount: number | null;
};

const reminderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]),
  completed: z.boolean().default(false),
  category: z.enum(["apply", "learn", "network", "review", "other"]),
  recurrence: z.enum(["daily", "weekly", "monthly"]).nullable().optional(),
});
type ReminderFormValues = z.infer<typeof reminderSchema>;

const priorityConfig: Record<string, { label: string; badge: string; dot: string; border: string }> = {
  low:    { label: "Low",    badge: "text-slate-600 bg-slate-100 border-slate-200",  dot: "bg-slate-400",  border: "border-l-slate-300" },
  medium: { label: "Medium", badge: "text-amber-700 bg-amber-100 border-amber-200",  dot: "bg-amber-400",  border: "border-l-amber-400" },
  high:   { label: "High",   badge: "text-red-700 bg-red-100 border-red-200",         dot: "bg-red-500",    border: "border-l-red-400" },
};

const categoryConfig: Record<string, { label: string; color: string }> = {
  apply:   { label: "Job Application", color: "bg-sky-100 text-sky-700" },
  learn:   { label: "Learning",        color: "bg-emerald-100 text-emerald-700" },
  network: { label: "Networking",      color: "bg-violet-100 text-violet-700" },
  review:  { label: "Review",          color: "bg-amber-100 text-amber-700" },
  other:   { label: "Other",           color: "bg-slate-100 text-slate-600" },
};

const recurrenceLabels: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

function RemindersPageInner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);

  const { data: reminders, isLoading } = useQuery<Reminder[]>({ queryKey: ["reminders"], queryFn: () => api<Reminder[]>("/reminders") });

  const createReminder = useMutation({
    mutationFn: (data: object) => api("/reminders", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reminders"] }); setIsCreateOpen(false); form.reset(); toast({ title: "Reminder added ✓" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateReminder = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => api(`/reminders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reminders"] }); setEditingReminderId(null); form.reset(); toast({ title: "Reminder updated ✓" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteReminder = useMutation({
    mutationFn: (id: number) => api(`/reminders/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reminders"] }); toast({ title: "Reminder deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const completeReminder = useMutation({
    mutationFn: (id: number) => api(`/reminders/${id}/complete`, { method: "PUT" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["due-warnings"] });
      if (data?.nextReminder) toast({ title: "Next reminder scheduled", description: `Due ${format(new Date(data.nextReminder.dueDate), "MMM d")}` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const form = useForm<ReminderFormValues>({
    // Keep the resolver boundary compatible with the workspace's mixed Zod
    // v3/v4 declarations without changing runtime validation behavior.
    resolver: zodResolver(reminderSchema as any),
    defaultValues: { title: "", description: "", dueDate: "", priority: "medium", completed: false, category: "other", recurrence: null },
  });

  const onSubmit = (data: ReminderFormValues) => {
    const payload = { ...data, description: data.description || null, dueDate: data.dueDate || null, recurrence: data.recurrence ?? null };
    if (editingReminderId) { updateReminder.mutate({ id: editingReminderId, data: payload }); }
    else createReminder.mutate(payload);
  };

  const handleEdit = (r: Reminder) => {
    form.reset({
      title: r.title, description: r.description || "", dueDate: r.dueDate ? r.dueDate.substring(0, 16) : "",
      priority: r.priority as any, completed: r.completed, category: r.category as any, recurrence: (r.recurrence as any) ?? null,
    });
    setEditingReminderId(r.id);
    setIsCreateOpen(true);
  };

  const toggleComplete = (r: Reminder) => {
    if (r.recurrence && !r.completed) { completeReminder.mutate(r.id); }
    else { updateReminder.mutate({ id: r.id, data: { title: r.title, priority: r.priority, category: r.category, completed: !r.completed, description: r.description, dueDate: r.dueDate } }); }
  };

  const activeReminders = (reminders ?? []).filter(r => !r.completed);
  const completedReminders = (reminders ?? []).filter(r => r.completed);
  const isOpen = isCreateOpen || editingReminderId !== null;

  const handleDialogClose = (open: boolean) => {
    if (!open) { setIsCreateOpen(false); setEditingReminderId(null); form.reset(); }
    else setIsCreateOpen(true);
  };

  const pendingHighPriority = activeReminders.filter(r => r.priority === "high").length;

  return (
    <div className="space-y-8 page-enter max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight text-foreground">Reminders & Tasks</h1>
          <p className="text-[15px] text-muted-foreground mt-1">Stay on top of applications, learning, and follow-ups.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-11 text-[14px] px-5"><Plus className="h-4 w-4" />Add Task</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-[18px]">{editingReminderId ? "Edit Task" : "Add New Task"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-3">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-semibold">Task Title *</FormLabel>
                    <FormControl><Input placeholder="e.g. Follow up with hiring manager" className="h-11" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-semibold">Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="apply">Job Application</SelectItem>
                          <SelectItem value="learn">Learning</SelectItem>
                          <SelectItem value="network">Networking</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-semibold">Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="low">🟢 Low</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="high">🔴 High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="recurrence" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-semibold flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />Recurrence
                    </FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                      <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="No recurrence" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (one-time)</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-semibold flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />Due Date (optional)
                    </FormLabel>
                    <FormControl><Input type="datetime-local" className="h-11" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-semibold">Description</FormLabel>
                    <FormControl><Textarea placeholder="Add details…" className="resize-none min-h-[80px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} className="text-[13px]">Cancel</Button>
                  <Button type="submit" disabled={createReminder.isPending || updateReminder.isPending} className="text-[13px]">
                    {(createReminder.isPending || updateReminder.isPending) ? "Saving…" : editingReminderId ? "Update Task" : "Add Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary chips */}
      {!isLoading && activeReminders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-[13px] px-3 py-1.5 rounded-full bg-secondary text-foreground font-semibold">{activeReminders.length} pending</span>
          {pendingHighPriority > 0 && (
            <span className="text-[13px] px-3 py-1.5 rounded-full bg-red-100 text-red-700 font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />{pendingHighPriority} high priority
            </span>
          )}
          {activeReminders.filter(r => r.recurrence).length > 0 && (
            <span className="text-[13px] px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />{activeReminders.filter(r => r.recurrence).length} recurring
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : activeReminders.length > 0 ? (
        <div className="space-y-3">
          {activeReminders
            .sort((a, b) => {
              const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
              const pDiff = (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
              if (pDiff !== 0) return pDiff;
              if (!a.dueDate && !b.dueDate) return 0;
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            })
            .map((reminder) => {
              const pc = priorityConfig[reminder.priority] ?? priorityConfig.low;
              const cc = categoryConfig[reminder.category] ?? categoryConfig.other;
              const daysLeft = reminder.dueDate ? Math.ceil((new Date(reminder.dueDate).getTime() - Date.now()) / 86400000) : null;
              const isOverdue = daysLeft !== null && daysLeft < 0;
              const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

              return (
                <div key={reminder.id}
                  className={`flex items-start gap-4 p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all group border-l-4 ${pc.border}`}>
                  <button onClick={() => toggleComplete(reminder)} className="text-muted-foreground hover:text-emerald-600 transition-colors shrink-0 mt-0.5">
                    <Circle className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-foreground leading-snug">{reminder.title}</p>
                        {reminder.description && (
                          <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">{reminder.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(reminder)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this task?")) deleteReminder.mutate(reminder.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full border ${pc.badge}`}>
                        {pc.label}
                      </span>
                      <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${cc.color}`}>
                        {cc.label}
                      </span>
                      {reminder.recurrence && (
                        <span className="text-[12px] font-semibold flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          <RefreshCw className="w-3 h-3" />{recurrenceLabels[reminder.recurrence]}{reminder.recurrenceCount ? ` ×${reminder.recurrenceCount}` : ""}
                        </span>
                      )}
                      {reminder.dueDate && (
                        <span className={`text-[12px] font-semibold flex items-center gap-1 px-2.5 py-0.5 rounded-full ${isOverdue ? "bg-red-100 text-red-700" : isSoon ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          <Clock className="h-3 w-3" />
                          {format(reminder.dueDate.includes("T") ? new Date(reminder.dueDate) : new Date(reminder.dueDate + "T00:00:00"), "MMM d, h:mm a")}
                          {isOverdue && " · overdue"}
                          {isSoon && !isOverdue && " · soon"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl bg-muted/10">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <BellRing className="h-7 w-7" />
          </div>
          <h3 className="text-[18px] font-semibold mb-2">You're all caught up!</h3>
          <p className="text-[14px] text-muted-foreground max-w-sm mb-6">No pending tasks. Add a reminder for your next application, learning goal, or networking follow-up.</p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add your first task</Button>
        </div>
      )}

      {/* Completed section */}
      {completedReminders.length > 0 && !isLoading && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-[17px] font-semibold text-muted-foreground">Completed ({completedReminders.length})</h2>
          </div>
          <div className="space-y-2">
            {completedReminders.map((reminder) => {
              const cc = categoryConfig[reminder.category] ?? categoryConfig.other;
              return (
                <div key={reminder.id} className="flex items-center gap-4 p-4 rounded-2xl border bg-muted/30 group hover:bg-muted/50 transition-colors">
                  <button onClick={() => toggleComplete(reminder)} className="text-emerald-500 hover:text-emerald-600 transition-colors shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-w-0 opacity-60">
                    <span className="text-[14px] font-semibold line-through text-foreground">{reminder.title}</span>
                    {reminder.description && (
                      <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cc.color}`}>{cc.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(reminder)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this task?")) deleteReminder.mutate(reminder.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RemindersPage() {
  return <PageErrorBoundary message="Could not load your reminders — please refresh"><RemindersPageInner /></PageErrorBoundary>;
}
