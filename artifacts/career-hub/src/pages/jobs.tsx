import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Plus, Pencil, Trash2, Building2, ExternalLink, CalendarDays, CircleCheckBig, Clock3, XCircle, Sparkles, Pin, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
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

type InterviewItem = {
  id: number;
  question: string;
  answer: string | null;
  category: string | null;
  createdAt: string;
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

const interviewSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
});

type JobFormValues = z.infer<typeof jobSchema>;
type InterviewFormValues = z.infer<typeof interviewSchema>;
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

const CATEGORIES = ["Behavioral", "Technical", "System Design", "Company Culture", "Salary & Role", "Other"];

export default function JobsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const { data: jobs = [], isLoading } = useQuery<Job[]>({ queryKey: ["jobs"], queryFn: () => api<Job[]>("/jobs") });
  const { data: analytics } = useQuery<Analytics>({ queryKey: ["jobs-analytics"], queryFn: () => api<Analytics>("/jobs/analytics") });
  const { data: interviews = [], isLoading: interviewsLoading } = useQuery<InterviewItem[]>({
    queryKey: ["interview-questions"],
    queryFn: () => api<InterviewItem[]>("/interview-questions"),
  });

  // — Job mutations —
  const createJob = useMutation({
    mutationFn: (data: JobApiPayload) => api("/jobs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (data) => { console.log("job save response", data); queryClient.invalidateQueries({ queryKey: ["jobs"] }); queryClient.invalidateQueries({ queryKey: ["jobs-analytics"] }); setIsCreateOpen(false); jobForm.reset(); toast({ title: "Job saved" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateJob = useMutation({
    mutationFn: ({ id, data }: { id: number; data: JobApiPayload }) => api(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); queryClient.invalidateQueries({ queryKey: ["jobs-analytics"] }); setEditingJobId(null); jobForm.reset(); toast({ title: "Job updated" }); },
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

  // — Interview item mutations —
  const createInterview = useMutation({
    mutationFn: (data: { question: string; answer: string | null; category: string | null }) =>
      api("/interview-questions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["interview-questions"] }); setIsInterviewOpen(false); interviewForm.reset(); toast({ title: "Interview question saved" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateInterview = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { question: string; answer: string | null; category: string | null } }) =>
      api(`/interview-questions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["interview-questions"] }); setEditingInterviewId(null); setIsInterviewOpen(false); interviewForm.reset(); toast({ title: "Interview question updated" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteInterview = useMutation({
    mutationFn: (id: number) => api(`/interview-questions/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["interview-questions"] }); toast({ title: "Interview question deleted" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // — Forms —
  const jobForm = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: { title: "", company: "", description: "", keywords: "", skills: "", notes: "", status: "saved", url: "", applyDate: "", interviewQuestions: "", interviewAnswers: "", pinned: false },
  });

  const interviewForm = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewSchema),
    defaultValues: { question: "", answer: "", category: "" },
  });

  const onJobSubmit = (data: JobFormValues) => {
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
    const payloadWithUser = { ...apiPayload, userId: user?.id };
    console.log("job save payload", payloadWithUser);
    console.log("job save mode", editingJobId ? "update" : "create");
    editingJobId ? updateJob.mutate({ id: editingJobId, data: apiPayload }) : createJob.mutate(payloadWithUser as JobApiPayload);
  };

  const onInterviewSubmit = (data: InterviewFormValues) => {
    const payload = {
      question: data.question,
      answer: data.answer || null,
      category: data.category || null,
    };
    editingInterviewId ? updateInterview.mutate({ id: editingInterviewId, data: payload }) : createInterview.mutate(payload);
  };

  const handleEditJob = (job: Job) => {
    jobForm.reset({
      title: job.title, company: job.company || "", description: job.description,
      keywords: job.keywords.join(", "), skills: job.skills.join(", "), notes: job.notes || "",
      status: job.status as JobFormValues["status"], url: job.url || "",
      applyDate: job.applyDate ? job.applyDate.substring(0, 10) : "",
      interviewQuestions: job.interviewQuestions.join("\n"), interviewAnswers: job.interviewAnswers.join("\n"), pinned: job.pinned,
    });
    setEditingJobId(job.id);
  };

  const handleEditInterview = (item: InterviewItem) => {
    interviewForm.reset({
      question: item.question,
      answer: item.answer || "",
      category: item.category || "",
    });
    setEditingInterviewId(item.id);
    setIsInterviewOpen(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const statusColors: Record<string, string> = {
    saved: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    applied: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    interviewing: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    offered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };

  const categoryColors: Record<string, string> = {
    "Behavioral": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    "Technical": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    "System Design": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    "Company Culture": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    "Salary & Role": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    "Other": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  const isJobOpen = isCreateOpen || editingJobId !== null;
  const isInterviewDialogOpen = isInterviewOpen || editingInterviewId !== null;

  const pipeline = useMemo(() => ({
    saved: jobs.filter((job) => job.status === "saved").length,
    applied: jobs.filter((job) => job.status === "applied").length,
    interviewing: jobs.filter((job) => job.status === "interviewing").length,
    offered: jobs.filter((job) => job.status === "offered").length,
    rejected: jobs.filter((job) => job.status === "rejected").length,
  }), [jobs]);

  const allCategories = useMemo(() => {
    const cats = [...new Set(interviews.map(i => i.category).filter(Boolean) as string[])].sort();
    return cats;
  }, [interviews]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter(item => {
      const catOk = categoryFilter === "all" || item.category === categoryFilter;
      return catOk;
    });
  }, [interviews, categoryFilter]);

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track opportunities, interview prep, and pipeline analytics.</p>
        </div>
        <div className="flex gap-2">
          {/* Add Q&A button */}
          <Dialog
            open={isInterviewDialogOpen}
            onOpenChange={(open) => {
              if (!open) { setIsInterviewOpen(false); setEditingInterviewId(null); interviewForm.reset(); }
              else { setIsInterviewOpen(true); }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><MessageSquare className="h-4 w-4" />Add Q&amp;A</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingInterviewId ? "Edit Interview Item" : "Add Interview Q&A"}</DialogTitle>
              </DialogHeader>
              <Form {...interviewForm}>
                <form onSubmit={interviewForm.handleSubmit(onInterviewSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={interviewForm.control}
                    name="question"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question *</FormLabel>
                        <FormControl><Textarea className="h-24 resize-none" placeholder="e.g. Tell me about a time you handled conflict on a team..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={interviewForm.control}
                    name="answer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Answer / Notes</FormLabel>
                        <FormControl><Textarea className="h-28 resize-none" placeholder="Your draft answer, key points, STAR framework notes..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={interviewForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createInterview.isPending || updateInterview.isPending}>
                      {(createInterview.isPending || updateInterview.isPending) ? "Saving..." : "Save Q&A"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Save Job button */}
          <Dialog
            open={isJobOpen}
            onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditingJobId(null); jobForm.reset(); } else { setIsCreateOpen(true); } }}
          >
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Save Job</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingJobId ? "Edit Job" : "Save New Job"}</DialogTitle></DialogHeader>
              <Form {...jobForm}>
                <form onSubmit={jobForm.handleSubmit(onJobSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={jobForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="e.g. Data Scientist" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={jobForm.control} name="company" render={({ field }) => (<FormItem><FormLabel>Company</FormLabel><FormControl><Input placeholder="e.g. TechCorp" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={jobForm.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="saved">Saved</SelectItem><SelectItem value="applied">Applied</SelectItem><SelectItem value="interviewing">Interviewing</SelectItem><SelectItem value="offered">Offered</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={jobForm.control} name="url" render={({ field }) => (<FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={jobForm.control} name="applyDate" render={({ field }) => (<FormItem><FormLabel>Apply Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={jobForm.control} name="pinned" render={({ field }) => (<FormItem><FormLabel>Pinned</FormLabel><FormControl><Button type="button" variant={field.value ? "default" : "outline"} onClick={() => field.onChange(!field.value)} className="gap-2"><Pin className="h-4 w-4" />{field.value ? "Pinned" : "Pin this job"}</Button></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={jobForm.control} name="skills" render={({ field }) => (<FormItem><FormLabel>Required Skills (comma separated)</FormLabel><FormControl><Input placeholder="Python, SQL, TensorFlow..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={jobForm.control} name="keywords" render={({ field }) => (<FormItem><FormLabel>Keywords (comma separated)</FormLabel><FormControl><Input placeholder="Remote, NLP, Startup..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={jobForm.control} name="interviewQuestions" render={({ field }) => (<FormItem><FormLabel>Interview Questions (one per line)</FormLabel><FormControl><Textarea className="h-24 resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={jobForm.control} name="interviewAnswers" render={({ field }) => (<FormItem><FormLabel>Answer Notes (one per line)</FormLabel><FormControl><Textarea className="h-24 resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={jobForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Brief description of the role..." className="h-24 resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="flex justify-end pt-4"><Button type="submit" disabled={createJob.isPending || updateJob.isPending}>{(createJob.isPending || updateJob.isPending) ? "Saving..." : "Save Job"}</Button></div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pipeline summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          { label: "Saved", value: pipeline.saved, icon: Briefcase, tone: "text-slate-600 bg-slate-100" },
          { label: "Applied", value: pipeline.applied, icon: Clock3, tone: "text-sky-600 bg-sky-100" },
          { label: "Interviewing", value: pipeline.interviewing, icon: Sparkles, tone: "text-amber-600 bg-amber-100" },
          { label: "Offered", value: pipeline.offered, icon: CircleCheckBig, tone: "text-emerald-600 bg-emerald-100" },
          { label: "Rejected", value: pipeline.rejected, icon: XCircle, tone: "text-rose-600 bg-rose-100" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-[#ebe5d8] bg-[#fdfcf8]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.tone}`}><Icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">{item.label}</p>
                  <p className="text-2xl font-bold text-slate-800 leading-none mt-1">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Job cards */}
      {isLoading
        ? <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}</div>
        : jobs.length > 0
          ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <Card key={job.id} className="flex flex-col hover-elevate">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[job.status] ?? ""}`}>{job.status}</span>
                        <CardTitle className="text-xl line-clamp-1">{job.title}</CardTitle>
                        {job.company && <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium"><Building2 className="h-4 w-4" />{job.company}</div>}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                          <CalendarDays className="h-4 w-4" />
                          {job.applyDate ? `Applied ${new Date(job.applyDate).toLocaleDateString()}` : "No date set"}
                        </div>
                      </div>
                      <div className="flex -mr-2 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => togglePin.mutate(job.id)}>
                          <Pin className={`h-4 w-4 ${job.pinned ? "text-primary" : ""}`} />
                        </Button>
                        {job.url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                            <a href={job.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditJob(job)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this job?")) deleteJob.mutate(job.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4 space-y-4">
                    <p className="text-sm text-foreground/80 line-clamp-3">{job.description}</p>
                    {job.skills.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.skills.map((skill, i) => <Badge key={i} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 font-medium">{skill}</Badge>)}
                        </div>
                      </div>
                    )}
                    {job.keywords.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.keywords.map((kw, i) => <Badge key={i} variant="outline" className="text-xs font-normal">{kw}</Badge>)}
                        </div>
                      </div>
                    )}
                    {job.interviewQuestions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interview Questions</p>
                        <div className="space-y-2">
                          {job.interviewQuestions.map((q, i) => (
                            <div key={i} className="rounded-xl border border-[#ebe5d8] bg-[#fdfcf8] p-2 text-sm text-slate-700">
                              <span className="font-medium">Q:</span> {q}
                              <div className="mt-1 text-xs text-muted-foreground">A: {job.interviewAnswers[i] ?? ""}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
          : (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/10">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"><Briefcase className="h-8 w-8" /></div>
              <h3 className="text-xl font-semibold mb-2">No jobs tracked</h3>
              <p className="text-muted-foreground max-w-md mb-6">Start saving job descriptions to identify the most demanded skills.</p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Track a Job</Button>
            </div>
          )
      }

      {/* Interview Q&A section */}
      <div className="rounded-[30px] border border-[#e4ddd2] bg-white dark:bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Interview Q&amp;A
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              {interviews.length} item{interviews.length !== 1 ? "s" : ""} saved · categorize, edit, delete, and link to jobs
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setIsInterviewOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />Add Q&amp;A
          </Button>
        </div>

        {/* Filters */}
        {interviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoryFilter === "all" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}
            >
              All categories
            </button>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? "all" : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoryFilter === cat ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Items grid */}
        {interviewsLoading
          ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-[20px]" />)}</div>
          : filteredInterviews.length > 0
            ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredInterviews.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const catColor = item.category ? (categoryColors[item.category] ?? "bg-slate-100 text-slate-700") : "";
                  return (
                    <div key={item.id} className="rounded-[20px] border border-[#ebe5d8] bg-[#fdfcf8] dark:bg-card dark:border-border p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">{item.question}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.category && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${catColor}`}>
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEditInterview(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete this Q&A item?")) deleteInterview.mutate(item.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                        {item.answer && (
                        <div>
                          <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            {isExpanded ? "Hide answer" : "Show answer"}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 rounded-xl bg-white dark:bg-background border border-[#e4ddd2] dark:border-border px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {item.answer}
                            </div>
                          )}
                        </div>
                      )}

                      {!item.answer && (
                        <p className="text-xs text-muted-foreground italic">No answer added yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )
            : (
              <div className="rounded-[20px] border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
                <MessageSquare className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {interviews.length === 0 ? "No interview Q&A saved yet. Click \"Add Q&A\" to get started." : "No items match the selected filters."}
                </p>
              </div>
            )
        }
      </div>

      {/* Analytics top skills */}
      {analytics && analytics.topSkills.length > 0 && (
        <div className="rounded-[30px] border border-[#e4ddd2] bg-white dark:bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100">Top Skills in Tracked Jobs</h2>
            <span className="text-[12px] text-slate-400">{analytics.questionsCount} Q&amp;As from jobs</span>
          </div>
          <div className="space-y-2">
            {analytics.topSkills.map((item) => (
              <div key={item.skill} className="flex items-center justify-between rounded-[16px] border border-[#ebe5d8] bg-[#fdfcf8] dark:bg-card dark:border-border px-4 py-2.5">
                <span className="text-sm text-slate-700 dark:text-slate-300">{item.skill}</span>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{item.count} job{item.count !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
