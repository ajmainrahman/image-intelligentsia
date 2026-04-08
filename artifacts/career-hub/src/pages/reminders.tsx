import { useState } from "react";
import { useListReminders, getListRemindersQueryKey, useCreateReminder, useUpdateReminder, useDeleteReminder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing, Plus, Pencil, Trash2, Calendar, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

const reminderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]),
  completed: z.boolean().default(false),
  category: z.enum(["apply", "learn", "network", "review", "other"]),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

export default function RemindersPage() {
  const { data: reminders, isLoading } = useListReminders({ query: { queryKey: getListRemindersQueryKey() } });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createReminder = useCreateReminder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
        setIsCreateOpen(false);
        toast({ title: "Reminder added", description: "Task has been added to your list." });
      },
    }
  });

  const updateReminder = useUpdateReminder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
        setEditingReminderId(null);
      },
    }
  });

  const deleteReminder = useDeleteReminder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
        toast({ title: "Reminder deleted", description: "Task has been removed." });
      },
    }
  });

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
      completed: false,
      category: "other",
    },
  });

  const onSubmit = (data: ReminderFormValues) => {
    const payload = {
      ...data,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    };

    if (editingReminderId) {
      updateReminder.mutate({ id: editingReminderId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
          setEditingReminderId(null);
          toast({ title: "Reminder updated", description: "Task details saved." });
        }
      });
    } else {
      createReminder.mutate({ data: payload });
    }
  };

  const handleEdit = (reminder: any) => {
    form.reset({
      title: reminder.title,
      description: reminder.description || "",
      dueDate: reminder.dueDate ? reminder.dueDate.substring(0, 16) : "",
      priority: reminder.priority,
      completed: reminder.completed,
      category: reminder.category,
    });
    setEditingReminderId(reminder.id);
  };

  const toggleComplete = (reminder: any) => {
    updateReminder.mutate({ 
      id: reminder.id, 
      data: {
        title: reminder.title,
        priority: reminder.priority,
        category: reminder.category,
        completed: !reminder.completed,
        description: reminder.description,
        dueDate: reminder.dueDate
      }
    });
  };

  const priorityColors = {
    low: "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400",
    medium: "text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400",
    high: "text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400",
  };

  const activeReminders = reminders?.filter(r => !r.completed) || [];
  const completedReminders = reminders?.filter(r => r.completed) || [];

  return (
    <div className="space-y-8 page-enter max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders & Tasks</h1>
          <p className="text-muted-foreground mt-1">Keep track of your applications, networking, and learning tasks.</p>
        </div>
        
        <Dialog open={isCreateOpen || editingReminderId !== null} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingReminderId(null);
            form.reset();
          } else {
            setIsCreateOpen(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingReminderId ? "Edit Task" : "Add New Task"}</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Follow up with hiring manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
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
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Details..." 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={createReminder.isPending || updateReminder.isPending}
                  >
                    {(createReminder.isPending || updateReminder.isPending) ? "Saving..." : "Save Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : activeReminders.length > 0 ? (
        <div className="space-y-4">
          {activeReminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card shadow-sm hover:border-primary/20 transition-colors group">
              <button 
                onClick={() => toggleComplete(reminder)}
                className="text-muted-foreground hover:text-primary transition-colors shrink-0"
              >
                <Circle className="h-6 w-6" />
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold truncate">{reminder.title}</span>
                  <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0 ${priorityColors[reminder.priority as keyof typeof priorityColors]}`}>
                    {reminder.priority}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="capitalize text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                    {reminder.category}
                  </span>
                  {reminder.dueDate && (
                    <span className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(reminder.dueDate), "MMM d, h:mm a")}
                    </span>
                  )}
                </div>
                
                {reminder.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                    {reminder.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(reminder)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                  if (confirm("Are you sure you want to delete this task?")) {
                    deleteReminder.mutate({ id: reminder.id });
                  }
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <BellRing className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">You're all caught up!</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            No pending tasks. Add a new reminder for your next application, learning goal, or networking follow-up.
          </p>
        </div>
      )}

      {completedReminders.length > 0 && !isLoading && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Completed</h2>
          <div className="space-y-3">
            {completedReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center gap-4 p-3 rounded-xl border bg-muted/30 group">
                <button 
                  onClick={() => toggleComplete(reminder)}
                  className="text-green-500 hover:text-green-600 transition-colors shrink-0"
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
                
                <div className="flex-1 min-w-0 opacity-60">
                  <span className="font-medium truncate line-through">{reminder.title}</span>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                    if (confirm("Are you sure you want to delete this task?")) {
                      deleteReminder.mutate({ id: reminder.id });
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}