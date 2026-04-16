import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Map as MapIcon, Plus, Pencil, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

type RoadmapItem = {
  id: number;
  title: string;
  description: string | null;
  yearTarget: number;
  phase: string;
  status: string;
  order: number;
};

const roadmapItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  yearTarget: z.coerce.number().min(2020).max(2100),
  phase: z.enum(["short_term", "mid_term", "long_term"]),
  status: z.enum(["planned", "in_progress", "completed"]),
  order: z.coerce.number().default(0),
});

type RoadmapItemFormValues = z.infer<typeof roadmapItemSchema>;

const phases = [
  { id: "short_term", label: "Short Term (1-2 yrs)", description: "Foundational skills and first roles" },
  { id: "mid_term", label: "Mid Term (3-5 yrs)", description: "Specialization and senior positions" },
  { id: "long_term", label: "Long Term (6-10 yrs)", description: "Leadership and mastery" },
] as const;

export default function RoadmapPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [activePhase, setActivePhase] = useState<"short_term" | "mid_term" | "long_term">("short_term");

  const { data: roadmapItems, isLoading } = useQuery<RoadmapItem[]>({
    queryKey: ["roadmap"],
    queryFn: () => api<RoadmapItem[]>("/roadmap"),
  });

  const createRoadmapItem = useMutation({
    mutationFn: (data: object) => api("/roadmap", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Milestone added", description: "Your roadmap has been updated." });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRoadmapItem = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      api(`/roadmap/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      setEditingItemId(null);
      form.reset();
      toast({ title: "Milestone updated" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteRoadmapItem = useMutation({
    mutationFn: (id: number) => api(`/roadmap/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      toast({ title: "Milestone deleted" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const form = useForm<RoadmapItemFormValues>({
    resolver: zodResolver(roadmapItemSchema),
    defaultValues: { title: "", description: "", yearTarget: new Date().getFullYear(), phase: "short_term", status: "planned", order: 0 },
  });

  const onSubmit = (data: RoadmapItemFormValues) => {
    const payload = { ...data, description: data.description || null };
    if (editingItemId) {
      updateRoadmapItem.mutate({ id: editingItemId, data: payload });
    } else {
      createRoadmapItem.mutate(payload);
    }
  };

  const handleEdit = (item: RoadmapItem) => {
    form.reset({ title: item.title, description: item.description || "", yearTarget: item.yearTarget, phase: item.phase as RoadmapItemFormValues["phase"], status: item.status as RoadmapItemFormValues["status"], order: item.order });
    setEditingItemId(item.id);
  };

  const getStatusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status === "in_progress") return <Clock className="h-5 w-5 text-blue-500" />;
    return <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />;
  };

  const itemsByPhase = (roadmapItems ?? []).reduce((acc, item) => {
    if (!acc[item.phase]) acc[item.phase] = [];
    acc[item.phase].push(item);
    return acc;
  }, {} as Record<string, RoadmapItem[]>);

  Object.keys(itemsByPhase).forEach(phase => {
    itemsByPhase[phase].sort((a, b) => a.yearTarget !== b.yearTarget ? a.yearTarget - b.yearTarget : a.order - b.order);
  });

  const isOpen = isCreateOpen || editingItemId !== null;

  return (
    <div className="space-y-8 page-enter max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Career Roadmap</h1>
          <p className="text-muted-foreground mt-1">Your 10-year path to mastery.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditingItemId(null); form.reset(); } else { setIsCreateOpen(true); form.setValue("phase", activePhase); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Milestone</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>{editingItemId ? "Edit Milestone" : "Add Milestone"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g. Master Deep Learning" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="phase" render={({ field }) => (
                    <FormItem><FormLabel>Phase</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="short_term">Short Term (1-2y)</SelectItem>
                          <SelectItem value="mid_term">Mid Term (3-5y)</SelectItem>
                          <SelectItem value="long_term">Long Term (6-10y)</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="yearTarget" render={({ field }) => (
                    <FormItem><FormLabel>Target Year</FormLabel><FormControl><Input type="number" placeholder="2025" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Details about this milestone..." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createRoadmapItem.isPending || updateRoadmapItem.isPending}>
                    {(createRoadmapItem.isPending || updateRoadmapItem.isPending) ? "Saving..." : "Save Milestone"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex space-x-1 p-1 bg-muted rounded-lg w-full mb-8">
        {phases.map((phase) => (
          <button key={phase.id} onClick={() => setActivePhase(phase.id)}
            className={`flex-1 flex items-center justify-center py-2.5 px-4 text-sm font-medium rounded-md transition-all ${activePhase === phase.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"}`}>
            {phase.label}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">{phases.find(p => p.id === activePhase)?.label}</h2>
          <p className="text-muted-foreground">{phases.find(p => p.id === activePhase)?.description}</p>
        </div>
        {isLoading ? (
          <div className="space-y-6">{[1, 2, 3].map(i => <div key={i} className="flex gap-4"><Skeleton className="h-6 w-6 rounded-full shrink-0" /><Skeleton className="h-24 w-full rounded-xl" /></div>)}</div>
        ) : itemsByPhase[activePhase]?.length > 0 ? (
          <div className="relative">
            <div className="absolute top-4 left-[11px] bottom-4 w-0.5 bg-border -z-10" />
            <div className="space-y-8">
              {itemsByPhase[activePhase].map((item) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="mt-1 bg-card rounded-full ring-4 ring-card">{getStatusIcon(item.status)}</div>
                  <div className="flex-1 border rounded-lg p-4 bg-background shadow-sm hover:border-primary/30 transition-colors relative">
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this milestone?")) deleteRoadmapItem.mutate(item.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary hover:bg-primary/20 font-medium">Target: {item.yearTarget}</Badge>
                    <h3 className="text-lg font-semibold mb-1 pr-16">{item.title}</h3>
                    {item.description && <p className="text-muted-foreground text-sm leading-relaxed mt-2">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"><MapIcon className="h-6 w-6" /></div>
            <h3 className="text-lg font-semibold mb-2">No milestones in this phase</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">Plan out the key achievements you need to reach your career goals during this time period.</p>
            <Button onClick={() => { form.setValue("phase", activePhase); setIsCreateOpen(true); }} className="gap-2"><Plus className="h-4 w-4" />Add First Milestone</Button>
          </div>
        )}
      </div>
    </div>
  );
}
