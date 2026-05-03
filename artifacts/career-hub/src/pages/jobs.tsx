import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Plus, Pencil, Trash2, Building2, ExternalLink, CalendarDays, CircleCheckBig, Clock3, XCircle, Sparkles, Pin, HelpCircle, MessageSquareText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

type Job = {
  id: number;
  title: string;
  company: string | null;
  description: string;
  keywords: string[];
  skills: string[];
  notes: string | null;
  status: string;
  url: string | null;
  applyDate: string | null;
  interviewQuestions: string[];
  interviewAnswers: string[];
  pinned: boolean;
};

type Analytics = {
  totalJobs: number;
  pinned: number;
  interviewCount: number;
  questionsCount: number;
  topSkills: { skill: string; count: number }[];
};

const jobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  keywords: z.string(),
  skills: z.string(),
  notes: z.string().optional(),
  status: z.enum(["saved", "applied", "interviewing", "rejected", "offered"]),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  applyDate: z.string().optional().or(z.literal("")),
  interviewQuestions: z.string(),
  interviewAnswers: z.string(),
  pinned: z.boolean(),
});

type JobFormValues = z.infer<typeof jobSchema>;
type JobApiPayload = {
  title: string;
  company: string | null;
  description: string;
  keywords: string[];
  skills: string[];
  notes: string | null;
  status: JobFormValues["status"];
  url: string | null;
  applyDate: string | null;
  interviewQuestions: string[];
  interviewAnswers: string[];
  pinned: boolean;
};

export default function JobsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);

  const { data: jobs = [], isLoading } = useQuery<Job[]>({ queryKey: ["jobs"], queryFn: () => api<Job[]>("/jobs") });
  const { data: analytics } = useQuery<Analytics>({ queryKey: ["jobs-analytics"], queryFn: () => api<Analytics>("/jobs/analytics") });

  const createJob = useMutation({
    mutationFn: (data: JobApiPayload) => api("/jobs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); queryClient.invalidateQueries({ queryKey: ["jobs-analytics"] }); setIsCreateOpen(false); form.reset(); toast({ title: "Job saved" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateJob = useMutation({
    mutationFn: ({ id, data }: { id: number; data: JobApiPayload }) => api(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); queryClient.invalidateQueries({ queryKey: ["jobs-analytics"] }); setEditingJobId(null); form.reset(); toast({ title: "Job updated" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteJob = useMutation({
    mutationFn: (id: number) => api(`/jobs/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); queryClient.invalidateQueries({ queryKey: ["jobs-analytics"] }); toast({ title: "Job deleted" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const togglePin = useMutation({
    mutationFn: (id: number) => api(`/jobs/${id}/pin`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); queryClient.invalidateQueries({ queryKey: ["jobs-analytics"] }); },
  });

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: { title: "", company: "", description: "", keywords: "", skills: "", notes: "", status: "saved", url: "", applyDate: "", interviewQuestions: "", interviewAnswers: "", pinned: false },
  });

  const onSubmit = (data: JobFormValues) => {
    const apiPayload: JobApiPayload = {
      ...data,
      company: data.company || null,
      notes: data.notes || null,
      url: data.url || null,
      applyDate: data.applyDate || null,
      keywords: data.keywords.split(",").map(s => s.trim()).filter(Boolean),
      skills: data.skills.split(",").map(s => s.trim()).filter(Boolean),
      interviewQuestions: data.interviewQuestions.split("\n").map(s => s.trim()).filter(Boolean),
      interviewAnswers: data.interviewAnswers.split("\n").map(s => s.trim()).filter(Boolean),
      pinned: Boolean(data.pinned),
    };
    editingJobId ? updateJob.mutate({ id: editingJobId, data: apiPayload }) : createJob.mutate(apiPayload);
  };

  const handleEdit = (job: Job) => {
    form.reset({
      title: job.title, company: job.company || "", description: job.description,
      keywords: job.keywords.join(", "), skills: job.skills.join(", "), notes: job.notes || "",
      status: job.status as JobFormValues["status"], url: job.url || "",
      applyDate: job.applyDate ? job.applyDate.substring(0, 10) : "",
      interviewQuestions: job.interviewQuestions.join("\n"), interviewAnswers: job.interviewAnswers.join("\n"), pinned: job.pinned,
    });
    setEditingJobId(job.id);
  };

  const statusColors: Record<string, string> = {
    saved: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    applied: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    interviewing: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    offered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };

  const isOpen = isCreateOpen || editingJobId !== null;
  const pipeline = useMemo(() => ({
    saved: jobs.filter((job) => job.status === "saved").length,
    applied: jobs.filter((job) => job.status === "applied").length,
    interviewing: jobs.filter((job) => job.status === "interviewing").length,
    offered: jobs.filter((job) => job.status === "offered").length,
    rejected: jobs.filter((job) => job.status === "rejected").length,
  }), [jobs]);

  const pinnedJobs = jobs.filter((job) => job.pinned);
  const interviewJobs = jobs.filter((job) => job.interviewQuestions.length > 0 || job.interviewAnswers.length > 0);

  return (
    <div className="space-y-8 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Tracker</h1>
          <p className="text-muted-foreground mt-1">Track opportunities, interview prep, and pipeline analytics.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditingJobId(null); form.reset(); } else { setIsCreateOpen(true); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Save Job</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingJobId ? "Edit Job" : "Save New Job"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="e.g. Data Scientist" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="company" render={({ field }) => (<FormItem><FormLabel>Company</FormLabel><FormControl><Input placeholder="e.g. TechCorp" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="saved">Saved</SelectItem><SelectItem value="applied">Applied</SelectItem><SelectItem value="interviewing">Interviewing</SelectItem><SelectItem value="offered">Offered</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="url" render={({ field }) => (<FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="applyDate" render={({ field }) => (<FormItem><FormLabel>Apply Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="pinned" render={({ field }) => (<FormItem><FormLabel>Pinned</FormLabel><FormControl><Button type="button" variant={field.value ? "default" : "outline"} onClick={() => field.onChange(!field.value)} className="gap-2"><Pin className="h-4 w-4" />{field.value ? "Pinned" : "Pin this job"}</Button></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="skills" render={({ field }) => (<FormItem><FormLabel>Required Skills (comma separated)</FormLabel><FormControl><Input placeholder="Python, SQL, TensorFlow..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="keywords" render={({ field }) => (<FormItem><FormLabel>Keywords (comma separated)</FormLabel><FormControl><Input placeholder="Remote, NLP, Startup..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="interviewQuestions" render={({ field }) => (<FormItem><FormLabel>Interview Questions (one per line)</FormLabel><FormControl><Textarea className="h-24 resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="interviewAnswers" render={({ field }) => (<FormItem><FormLabel>Answer Notes (one per line)</FormLabel><FormControl><Textarea className="h-24 resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Brief description of the role..." className="h-24 resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="flex justify-end pt-4"><Button type="submit" disabled={createJob.isPending || updateJob.isPending}>{(createJob.isPending || updateJob.isPending) ? "Saving..." : "Save Job"}</Button></div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          { label: "Saved", value: pipeline.saved, icon: Briefcase, tone: "text-slate-600 bg-slate-100" },
          { label: "Applied", value: pipeline.applied, icon: Clock3, tone: "text-sky-600 bg-sky-100" },
          { label: "Interviewing", value: pipeline.interviewing, icon: Sparkles, tone: "text-amber-600 bg-amber-100" },
          { label: "Offered", value: pipeline.offered, icon: CircleCheckBig, tone: "text-emerald-600 bg-emerald-100" },
          { label: "Rejected", value: pipeline.rejected, icon: XCircle, tone: "text-rose-600 bg-rose-100" },
        ].map((item) => { const Icon = item.icon; return (<Card key={item.label} className="border-[#ebe5d8] bg-[#fdfcf8]"><CardContent className="p-4 flex items-center gap-3"><div className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.tone}`}><Icon className="h-4 w-4" /></div><div><p className="text-[11px] uppercase tracking-wider text-slate-400">{item.label}</p><p className="text-2xl font-bold text-slate-800 leading-none mt-1">{item.value}</p></div></CardContent></Card>); })}
      </div>

      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="rounded-3xl border-[#e4ddd2] bg-white"><CardContent className="p-5"><div className="flex items-center gap-2 text-slate-800 font-semibold mb-2"><Sparkles className="h-4 w-4" />Pinned</div><p className="text-3xl font-bold">{analytics.pinned}</p><p className="text-xs text-muted-foreground">{analytics.totalJobs} tracked</p></CardContent></Card>
          <Card className="rounded-3xl border-[#e4ddd2] bg-white"><CardContent className="p-5"><div className="flex items-center gap-2 text-slate-800 font-semibold mb-2"><HelpCircle className="h-4 w-4" />Interview questions</div><p className="text-3xl font-bold">{analytics.questionsCount}</p><p className="text-xs text-muted-foreground">Stored in your pipeline</p></CardContent></Card>
          <Card className="rounded-3xl border-[#e4ddd2] bg-white"><CardContent className="p-5"><div className="flex items-center gap-2 text-slate-800 font-semibold mb-2"><MessageSquareText className="h-4 w-4" />Interviewing</div><p className="text-3xl font-bold">{analytics.interviewCount}</p><p className="text-xs text-muted-foreground">Active stage</p></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="rounded-3xl border-[#e4ddd2] bg-white"><CardHeader><CardTitle className="flex items-center gap-2"><Pin className="h-4 w-4" />Pinned items</CardTitle></CardHeader><CardContent className="space-y-3">{pinnedJobs.length === 0 ? <p className="text-sm text-muted-foreground">Pin jobs to keep them at the top.</p> : pinnedJobs.map((job) => <div key={job.id} className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-3 flex items-start justify-between gap-3"><div><p className="font-medium text-slate-800">{job.title}</p><p className="text-xs text-muted-foreground">{job.company ?? "No company"}</p></div><Button variant="ghost" size="icon" onClick={() => togglePin.mutate(job.id)}><Pin className="h-4 w-4" /></Button></div>)}</CardContent></Card>
        <Card className="rounded-3xl border-[#e4ddd2] bg-white"><CardHeader><CardTitle className="flex items-center gap-2"><HelpCircle className="h-4 w-4" />Interview prep tracker</CardTitle></CardHeader><CardContent className="space-y-3">{interviewJobs.length === 0 ? <p className="text-sm text-muted-foreground">Add interview questions to any job and keep your answers here.</p> : interviewJobs.slice(0, 4).map((job) => <div key={job.id} className="rounded-2xl border border-[#ebe5d8] bg-[#fdfcf8] p-3"><p className="font-medium text-slate-800">{job.title}</p><p className="text-xs text-muted-foreground mt-1">{job.interviewQuestions.length} questions · {job.interviewAnswers.length} answers</p></div>)}</CardContent></Card>
      </div>

      {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}</div> : jobs && jobs.length > 0 ? <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{jobs.map((job) => (<Card key={job.id} className="flex flex-col hover-elevate"><CardHeader className="pb-3"><div className="flex items-start justify-between"><div className="space-y-1.5"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[job.status] ?? ""}`}>{job.status}</span><CardTitle className="text-xl line-clamp-1">{job.title}</CardTitle>{job.company && <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium"><Building2 className="h-4 w-4" />{job.company}</div>}{job.applyDate && <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium"><CalendarDays className="h-4 w-4" />Applied {new Date(job.applyDate).toLocaleDateString()}</div>}</div><div className="flex -mr-2 shrink-0"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => togglePin.mutate(job.id)}><Pin className={`h-4 w-4 ${job.pinned ? "text-primary" : ""}`} /></Button>{job.url && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild><a href={job.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>}<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(job)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this job?")) deleteJob.mutate(job.id); }}><Trash2 className="h-4 w-4" /></Button></div></div></CardHeader><CardContent className="flex-1 pb-4 space-y-4"><p className="text-sm text-foreground/80 line-clamp-3">{job.description}</p>{job.skills.length > 0 && (<div className="space-y-2 pt-2 border-t"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required Skills</p><div className="flex flex-wrap gap-1.5">{job.skills.map((skill, i) => <Badge key={i} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 font-medium">{skill}</Badge>)}</div></div>)}{job.keywords.length > 0 && (<div className="space-y-2 pt-2 border-t"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keywords</p><div className="flex flex-wrap gap-1.5">{job.keywords.map((kw, i) => <Badge key={i} variant="outline" className="text-xs font-normal">{kw}</Badge>)}</div></div>)}{job.interviewQuestions.length > 0 && (<div className="space-y-2 pt-2 border-t"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interview questions</p><div className="space-y-2">{job.interviewQuestions.map((q, i) => (<div key={i} className="rounded-xl border border-[#ebe5d8] bg-[#fdfcf8] p-2 text-sm text-slate-700"><span className="font-medium">Q:</span> {q}<div className="mt-1 text-xs text-muted-foreground">A: {job.interviewAnswers[i] ?? ""}</div></div>))}</div></div>)}</CardContent></Card>))}</div> : <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/10"><div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"><Briefcase className="h-8 w-8" /></div><h3 className="text-xl font-semibold mb-2">No jobs tracked</h3><p className="text-muted-foreground max-w-md mb-6">Start saving job descriptions to identify the most demanded skills.</p><Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Track a Job</Button></div>}
    </div>
  );
}
