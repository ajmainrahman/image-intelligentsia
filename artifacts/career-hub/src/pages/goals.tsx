import { useState } from "react";
import { useListGoals, getListGoalsQueryKey, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  targetRole: z.string().min(1, "Target role is required"),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "paused"]),
  targetYear: z.coerce.number().min(2020).max(2100).optional().or(z.literal("")),
});

type GoalFormValues = z.infer<typeof goalSchema>;

export default function GoalsPage() {
  const { data: goals, isLoading } = useListGoals({ query: { queryKey: getListGoalsQueryKey() } });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createGoal = useCreateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        setIsCreateOpen(false);
        toast({ title: "Goal created", description: "Your new career goal has been saved." });
      },
    }
  });

  const updateGoal = useUpdateGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        setEditingGoalId(null);
        toast({ title: "Goal updated", description: "Career goal changes saved." });
      },
    }
  });

  const deleteGoal = useDeleteGoal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        toast({ title: "Goal deleted", description: "The career goal has been removed." });
      },
    }
  });

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      targetRole: "",
      description: "",
      status: "active",
      targetYear: new Date().getFullYear(),
    },
  });

  const onSubmit = (data: GoalFormValues) => {
    const payload = {
      ...data,
      targetYear: data.targetYear ? Number(data.targetYear) : null,
      description: data.description || null,
    };

    if (editingGoalId) {
      updateGoal.mutate({ id: editingGoalId, data: payload });
    } else {
      createGoal.mutate({ data: payload });
    }
  };

  const handleEdit = (goal: any) => {
    form.reset({
      title: goal.title,
      targetRole: goal.targetRole,
      description: goal.description || "",
      status: goal.status,
      targetYear: goal.targetYear || "",
    });
    setEditingGoalId(goal.id);
  };

  const statusColors = {
    active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    paused: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };

  return (
    <div className="space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Career Goals</h1>
          <p className="text-muted-foreground mt-1">Define your path and target roles.</p>
        </div>
        
        <Dialog open={isCreateOpen || editingGoalId !== null} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingGoalId(null);
            form.reset();
          } else {
            setIsCreateOpen(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingGoalId ? "Edit Goal" : "Create New Goal"}</DialogTitle>
              <DialogDescription>
                Define your target role and when you aim to achieve it.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Transition to Machine Learning" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. ML Engineer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Year</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2025" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
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
                          placeholder="What will this role entail and why is it important?" 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={createGoal.isPending || updateGoal.isPending}
                  >
                    {(createGoal.isPending || updateGoal.isPending) ? "Saving..." : "Save Goal"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <Card key={goal.id} className="flex flex-col hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[goal.status as keyof typeof statusColors]}`}>
                      {goal.status}
                    </span>
                    <CardTitle className="text-xl line-clamp-2 leading-tight">{goal.title}</CardTitle>
                  </div>
                  <div className="flex -mr-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(goal)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                      if (confirm("Are you sure you want to delete this goal?")) {
                        deleteGoal.mutate({ id: goal.id });
                      }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {goal.description || "No description provided."}
                </p>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 pt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  {goal.targetRole}
                </div>
                {goal.targetYear && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {goal.targetYear}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/10">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Target className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No goals defined yet</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Start by setting a long-term career objective. Whether it's becoming a Data Scientist or mastering ML engineering, clarity is the first step.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create First Goal
          </Button>
        </div>
      )}
    </div>
  );
}