import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Plus, Pencil, Trash2, Code, Book, Award, Cpu, Folder, MoreHorizontal, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

type ProgressEntry = {
  id: number;
  title: string;
  category: string;
  description: string | null;
  status: string;
  toolOrResource: string | null;
};

const progressSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["course", "tool", "project", "certification", "reading", "other"]),
  description: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  toolOrResource: z.string().optional(),
});

type ProgressFormValues = z.infer<typeof progressSchema>;

const statusColors: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

const categoryIcons: Record<string, React.ElementType> = {
  course: Book, tool: Cpu, project: Code, certification: Award, reading: BookOpen, other: Folder,
};

export default function ProgressPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  const { data: progressEntries, isLoading } = useQuery<ProgressEntry[]>({
    queryKey: ["progress"],
    queryFn: () => api<ProgressEntry[]>("/progress"),
  });

  const createProgress = useMutation({
    mutationFn: (data: object) => api("/progress", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Progress logged", description: "Your learning progress has been tracked." });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateProgress = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      api(`/progress/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      setEditingEntryId(null);
      form.reset();
      toast({ title: "Progress updated" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteProgress = useMutation({
    mutationFn: (id: number) => api(`/progress/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      toast({ title: "Progress deleted" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const form = useForm<ProgressFormValues>({
    resolver: zodResolver(progressSchema),
    defaultValues: { title: "", category: "course", description: "", status: "not_started", toolOrResource: "" },
  });

  const onSubmit = (data: ProgressFormValues) => {
    const payload = { ...data, description: data.description || null, toolOrResource: data.toolOrResource || null };
    if (editingEntryId) {
      updateProgress.mutate({ id: editingEntryId, data: payload });
    } else {
      createProgress.mutate(payload);
    }
  };

  const handleEdit = (entry: ProgressEntry) => {
    form.reset({ title: entry.title, category: entry.category as ProgressFormValues["category"], description: entry.description || "", status: entry.status as ProgressFormValues["status"], toolOrResource: entry.toolOrResource || "" });
    setEditingEntryId(entry.id);
  };

  const isOpen = isCreateOpen || editingEntryId !== null;

  return (
    <div className="space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Progress</h1>
          <p className="text-muted-foreground mt-1">Track courses, tools, and projects you are working on.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditingEntryId(null); form.reset(); } else { setIsCreateOpen(true); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Log Progress</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingEntryId ? "Edit Progress" : "Log New Progress"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g. Advanced SQL for Data Science" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="course">Course</SelectItem>
                          <SelectItem value="tool">Tool</SelectItem>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="certification">Certification</SelectItem>
                          <SelectItem value="reading">Reading</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="toolOrResource" render={({ field }) => (
                  <FormItem><FormLabel>Tool or Resource</FormLabel><FormControl><Input placeholder="e.g. Coursera, TensorFlow" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Notes or details..." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createProgress.isPending || updateProgress.isPending}>
                    {(createProgress.isPending || updateProgress.isPending) ? "Saving..." : "Save Progress"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : progressEntries && progressEntries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {progressEntries.map((entry) => {
            const Icon = categoryIcons[entry.category] ?? MoreHorizontal;
            return (
              <Card key={entry.id} className="flex flex-col hover-elevate overflow-hidden border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Icon className="h-4 w-4" /></div>
                      <Badge variant="outline" className={`capitalize border-none ${statusColors[entry.status] ?? ""}`}>{entry.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex -mr-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(entry)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this entry?")) deleteProgress.mutate(entry.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg line-clamp-2 mt-2">{entry.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  {entry.toolOrResource && <div className="flex items-center gap-1.5 text-sm text-primary/80 font-medium mb-2"><LinkIcon className="h-3.5 w-3.5" />{entry.toolOrResource}</div>}
                  <p className="text-sm text-muted-foreground line-clamp-2">{entry.description || "No description provided."}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/10">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"><BookOpen className="h-8 w-8" /></div>
          <h3 className="text-xl font-semibold mb-2">No learning progress logged</h3>
          <p className="text-muted-foreground max-w-md mb-6">Track courses you're taking, tools you're mastering, or projects you're building.</p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Log Your First Course or Tool</Button>
        </div>
      )}
    </div>
  );
}
