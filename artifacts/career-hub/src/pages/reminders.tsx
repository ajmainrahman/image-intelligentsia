import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing, Plus, Pencil, Trash2, Calendar, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

const priorityColors: Record<string, string> = {
  low: "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400",
  medium: "text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400",
  high: "text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400",
};
const recurrenceLabels: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);

  const { data: reminders, isLoading } = useQuery<Reminder[]>({ queryKey: ["reminders"], queryFn: () => api<Reminder[]>("/reminders") });

  const createReminder = useMutation({
    mutationFn: (data: object) => api("/reminders", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reminders"] }); setIsCreateOpen(false); form.reset(); toast({ title: "Reminder added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateReminder = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => api(`/reminders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reminders"] }); setEditingReminderId(null); form.reset(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteReminder = useMutation({
    mutationFn: (id: number) => api(`/reminders/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reminders"] }); toast({ title: "Reminder deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  // New: complete with recurrence support
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
    resolver: zodResolver(reminderSchema),
    defaultValues: { title: "", description: "", dueDate: "", priority: "medium", completed: false, category: "other", recurrence: null },
  });

  const onSubmit = (data: ReminderFormValues) => {
    const payload = { ...data, description: data.description || null, dueDate: data.dueDate || null, recurrence: data.recurrence ?? null };
    if (editingReminderId) { updateReminder.mutate({ id: editingReminderId, data: payload }); toast({ title: "Reminder updated" }); }
    else createReminder.mutate(payload);
  };

  const handleEdit = (r: Reminder) => {
    form.reset({ title: r.title, description: r.description || "", dueDate: r.dueDate ? r.dueDate.substring(0, 16) : "", priority: r.priority as any, completed: r.completed, category: r.category as any, recurrence: (r.recurrence as any) ?? null });
    setEditingReminderId(r.id);
  };

  const toggleComplete = (r: Reminder) => {
    if (r.recurrence) { completeReminder.mutate(r.id); }
    else { updateReminder.mutate({ id: r.id, data: { title: r.title, priority: r.priority, category: r.category, completed: !r.completed, description: r.description, dueDate: r.dueDate } }); }
  };

  const activeReminders = reminders?.filter(r => !r.completed) || [];
  const completedReminders = reminders?.filter(r => r.completed) || [];
  const isOpen = isCreateOpen || editingReminderId !== null;

  return (
    <div className="space-y-8 page-enter max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders & Tasks</h1>
          <p className="text-muted-foreground mt-1">Keep track of your applications, networking, and learning tasks.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditingReminderId(null); form.reset(); } else { setIsCreateOpen(true); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Task</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>{editingReminderId ? "Edit Task" : "Add New Task"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Task Title</FormLabel><FormControl><Input placeholder="e.g. Follow up with hiring manager" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="apply">Job Application</SelectItem><SelectItem value="learn">Learning</SelectItem>
                          <SelectItem value="network">Networking</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem><FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="recurrence" render={({ field }) => (
                  <FormItem><FormLabel className="flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />Recurrence</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="No recurrence" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (one-time)</SelectItem><SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>Due Date (Optional)</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Details..." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createReminder.isPending || updateReminder.isPending}>
                    {(createReminder.isPending || updateReminder.isPending) ? "Saving..." : "Save Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : activeReminders.length > 0 ? (
        <div className="space-y-4">
          {activeReminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card shadow-sm hover:border-primary/20 transition-colors group">
              <button onClick={() => toggleComplete(reminder)} className="text-muted-foreground hover:text-primary transition-colors shrink-0"><Circle className="h-6 w-6" /></button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold truncate">{reminder.title}</span>
                  <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0 ${priorityColors[reminder.priority] ?? ""}`}>{reminder.priority}</Badge>
                  {reminder.recurrence && (
                    <Badge variant="outline" className="text-xs gap-1 text-blue-600 border-blue-200">
                      <RefreshCw className="w-3 h-3" />{recurrenceLabels[reminder.recurrence]}{reminder.recurrenceCount ? ` ×${reminder.recurrenceCount}` : ""}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="capitalize text-xs font-medium bg-muted px-2 py-0.5 rounded-full">{reminder.category}</span>
                  {reminder.dueDate && <span className="flex items-center gap-1 text-xs"><Calendar className="h-3 w-3" />{format(new Date(reminder.dueDate), "MMM d, h:mm a")}</span>}
                </div>
                {reminder.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{reminder.description}</p>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(reminder)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this task?")) deleteReminder.mutate(reminder.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"><BellRing className="h-6 w-6" /></div>
          <h3 className="text-lg font-semibold mb-2">You're all caught up!</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">No pending tasks. Add a reminder for your next application, learning goal, or networking follow-up.</p>
        </div>
      )}

      {completedReminders.length > 0 && !isLoading && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Completed</h2>
          <div className="space-y-3">
            {completedReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center gap-4 p-3 rounded-xl border bg-muted/30 group">
                <button onClick={() => toggleComplete(reminder)} className="text-green-500 hover:text-green-600 transition-colors shrink-0"><CheckCircle2 className="h-5 w-5" /></button>
                <div className="flex-1 min-w-0 opacity-60"><span className="font-medium truncate line-through">{reminder.title}</span></div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this task?")) deleteReminder.mutate(reminder.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
