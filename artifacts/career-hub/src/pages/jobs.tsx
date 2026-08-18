import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, Plus, Pencil, Trash2, Building2, ExternalLink, CalendarDays,
  CircleCheckBig, Clock3, XCircle, Sparkles, Pin, MessageSquare,
  ChevronDown, ChevronUp, Clock, LayoutList, LayoutGrid, ArrowUpDown, Search
} from "lucide-react";
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
  description: z.string().optional(),
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
  title: string; company: string | null; description: string; keywords: string[];
  skills: string[]; notes: string | null; status: JobFormValues["status"];
  url: string | null; applyDate: string | null;
  interviewQuestions: string[]; interviewAnswers: string[]; pinned: boolean;
};

const CATEGORIES = ["Behavioral", "Technical", "System Design", "Company Culture", "Salary & Role", "Other"];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  saved:       { label: "Ready to Apply", bg: "bg-slate-100",  text: "text-slate-700",  dot: "bg-slate-400" },
  applied:     { label: "Applied",         bg: "bg-sky-100",    text: "text-sky-700",    dot: "bg-sky-500" },
  interviewing:{ label: "Interview",       bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500" },
  offered:     { label: "Waiting",         bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  rejected:    { label: "Rejected",        bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Behavioral": "bg-purple-100 text-purple-700",
  "Technical": "bg-sky-100 text-sky-700",
  "System Design": "bg-amber-100 text-amber-700",
  "Company Culture": "bg-emerald-100 text-emerald-700",
  "Salary & Role": "bg-rose-100 text-rose-700",
  "Other": "bg-slate-100 text-slate-700",
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function parseLocalDate(str: string): Date {
  return str.includes("T") || str.includes(" ") ? new Date(str) : new Date(str + "T00:00:00");
}

function getDeadlineInfo(applyDate: string | null) {
  if (!applyDate) return null;
  const deadline = parseLocalDate(applyDate);
  const now = new Date(); now.setHours(0, 0, 0, 0); deadline.setHours(0, 0, 0, 0);
  const days = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: "bg-red-100 text-red-600" };
  if (days === 0) return { label: "Due today!", cls: "bg-red-100 text-red-700" };
  if (days <= 7) return { label: `${days}d left`, cls: "bg-orange-100 text-orange-700" };
  if (days <= 30) return { label: `${days}d left`, cls: "bg-amber-100 text-amber-700" };
  return { label: `${days}d left`, cls: "bg-emerald-100 text-emerald-700" };
}

export default function JobsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortByDeadline, setSortByDeadline] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { data: jobs = [], isLoading } = useQuery<Job[]>({ queryKey: ["jobs"], queryFn: () => api<Job[]>("/jobs") });
  const { data: analytics } = useQuery<Analytics>({ queryKey: ["jobs-analytics"], queryFn: () => api<Analytics>("/jobs/analytics") });
  const { data: interviews = [], isLoading: interviewsLoading } = useQuery<InterviewItem[]>({
    queryKey: ["interview-questions"],
    queryFn: () => api<InterviewItem[]>("/interview-questions"),
  });

  const createJob = useMutation({
    mutationFn: (data: JobApiPayload) => api("/jobs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); queryClient.invalidateQueries({ queryKey: ["jobs-analytics"] }); setIsCreateOpen(false); jobForm.reset(); toast({ title: "Job saved" }); },
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
  const quickUpdateStatus = useMutation({
    mutationFn: ({ id, status, job }: { id: number; status: string; job: Job }) =>
      api(`/jobs/${id}`, { method: "PUT", body: JSON.stringify({ ...job, status }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); queryClient.invalidateQueries({ queryKey: ["jobs-analytics"] }); },
  });
  const togglePin = useMutation({
    mutationFn: (id: number) => api(`/jobs/${id}/pin`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); queryClient.invalidateQueries({ queryKey: ["jobs-analytics"] }); },
  });
  const createInterview = useMutation({
    mutationFn: (data: { question: string; answer: string | null; category: string | null }) =>
      api("/interview-questions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["interview-questions"] }); setIsInterviewOpen(false); interviewForm.reset(); toast({ title: "Interview question saved" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateInterview = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { question: string; answer: string | null; category: string | null } }) =>
      api(`/interview-questions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["interview-questions"] }); setEditingInterviewId(null); setIsInterviewOpen(false); interviewForm.reset(); toast({ title: "Updated" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteInterview = useMutation({
    mutationFn: (id: number) => api(`/interview-questions/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["interview-questions"] }); toast({ title: "Deleted" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const jobForm = useForm<JobFormValues>({
    // The workspace contains both Zod v3 and v4 type declarations. The
    // runtime schema remains unchanged; this keeps the resolver boundary
    // compatible with the form's inferred values across both versions.
    resolver: zodResolver(jobSchema as any),
    defaultValues: { title: "", company: "", description: "", keywords: "", skills: "", notes: "", status: "saved", url: "", applyDate: "", interviewQuestions: "", interviewAnswers: "", pinned: false },
  });
  const interviewForm = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewSchema as any),
    defaultValues: { question: "", answer: "", category: "" },
  });

  const onJobSubmit = (data: JobFormValues) => {
    const apiPayload: JobApiPayload = {
      ...data,
      description: data.description || "",
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
    editingJobId ? updateJob.mutate({ id: editingJobId, data: apiPayload }) : createJob.mutate({ ...apiPayload, ...(user?.id ? { userId: user.id } : {}) } as JobApiPayload);
  };

  const onInterviewSubmit = (data: InterviewFormValues) => {
    const payload = { question: data.question, answer: data.answer || null, category: data.category || null };
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
    interviewForm.reset({ question: item.question, answer: item.answer || "", category: item.category || "" });
    setEditingInterviewId(item.id);
    setIsInterviewOpen(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const isJobOpen = isCreateOpen || editingJobId !== null;
  const isInterviewDialogOpen = isInterviewOpen || editingInterviewId !== null;

  const pipeline = useMemo(() => ({
    saved: jobs.filter(j => j.status === "saved").length,
    applied: jobs.filter(j => j.status === "applied").length,
    interviewing: jobs.filter(j => j.status === "interviewing").length,
    offered: jobs.filter(j => j.status === "offered").length,
    rejected: jobs.filter(j => j.status === "rejected").length,
  }), [jobs]);

  const allCategories = useMemo(() => [...new Set(interviews.map(i => i.category).filter(Boolean) as string[])].sort(), [interviews]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    if (statusFilter !== "all") result = result.filter(j => j.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.company ?? "").toLowerCase().includes(q) ||
        (j.notes ?? "").toLowerCase().includes(q)
      );
    }
    if (sortByDeadline) {
      result.sort((a, b) => {
        if (!a.applyDate && !b.applyDate) return 0;
        if (!a.applyDate) return 1;
        if (!b.applyDate) return -1;
        return new Date(a.applyDate).getTime() - new Date(b.applyDate).getTime();
      });
    }
    return result;
  }, [jobs, statusFilter, search, sortByDeadline]);

  const filteredInterviews = useMemo(() =>
    interviews.filter(item => categoryFilter === "all" || item.category === categoryFilter),
    [interviews, categoryFilter]);

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track job opportunities across every stage of your search.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-border bg-background overflow-hidden">
            <button onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-[12px] font-medium flex items-center gap-1.5 transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              <LayoutList className="h-3.5 w-3.5" />Table
            </button>
            <button onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 text-[12px] font-medium flex items-center gap-1.5 transition-colors ${viewMode === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              <LayoutGrid className="h-3.5 w-3.5" />Cards
            </button>
          </div>

          {/* Interview Q&A dialog */}
          <Dialog open={isInterviewDialogOpen} onOpenChange={(open) => { if (!open) { setIsInterviewOpen(false); setEditingInterviewId(null); interviewForm.reset(); } else setIsInterviewOpen(true); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-[13px]"><MessageSquare className="h-4 w-4" />Add Q&amp;A</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingInterviewId ? "Edit Interview Item" : "Add Interview Q&A"}</DialogTitle></DialogHeader>
              <Form {...interviewForm}>
                <form onSubmit={interviewForm.handleSubmit(onInterviewSubmit)} className="space-y-4 pt-4">
                  <FormField control={interviewForm.control} name="question" render={({ field }) => (
                    <FormItem><FormLabel>Question *</FormLabel><FormControl><Textarea className="h-24 resize-none" placeholder="e.g. Tell me about a time you handled conflict..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={interviewForm.control} name="answer" render={({ field }) => (
                    <FormItem><FormLabel>Answer / Notes</FormLabel><FormControl><Textarea className="h-28 resize-none" placeholder="Your draft answer, key points..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={interviewForm.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="none">None</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createInterview.isPending || updateInterview.isPending}>
                      {(createInterview.isPending || updateInterview.isPending) ? "Saving..." : "Save Q&A"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Save Job dialog */}
          <Dialog open={isJobOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditingJobId(null); jobForm.reset(); } else setIsCreateOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 text-[13px]"><Plus className="h-4 w-4" />Add Job</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingJobId ? "Edit Job" : "Add New Job"}</DialogTitle></DialogHeader>
              <Form {...jobForm}>
                <form onSubmit={jobForm.handleSubmit(onJobSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={jobForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Job Title *</FormLabel><FormControl><Input placeholder="e.g. Data Scientist" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={jobForm.control} name="company" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="e.g. TechCorp" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={jobForm.control} name="status" render={({ field }) => (
                      <FormItem><FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="saved">Ready to Apply</SelectItem>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="interviewing">Interview</SelectItem>
                            <SelectItem value="offered">Waiting</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={jobForm.control} name="url" render={({ field }) => (<FormItem><FormLabel>Apply Link / Website</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={jobForm.control} name="applyDate" render={({ field }) => (<FormItem><FormLabel>Deadline / Apply Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={jobForm.control} name="pinned" render={({ field }) => (<FormItem><FormLabel>Pin</FormLabel><FormControl><Button type="button" variant={field.value ? "default" : "outline"} onClick={() => field.onChange(!field.value)} className="gap-2 w-full"><Pin className="h-4 w-4" />{field.value ? "Pinned" : "Pin this job"}</Button></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={jobForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Feedback / Notes</FormLabel><FormControl><Textarea className="h-20 resize-none" placeholder="Recruiter feedback, interview notes, thoughts..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={jobForm.control} name="skills" render={({ field }) => (<FormItem><FormLabel>Required Skills (comma separated)</FormLabel><FormControl><Input placeholder="Python, SQL, TensorFlow..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={jobForm.control} name="keywords" render={({ field }) => (<FormItem><FormLabel>Keywords (comma separated)</FormLabel><FormControl><Input placeholder="Remote, NLP, Startup..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={jobForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Role description..." className="h-24 resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={jobForm.control} name="interviewQuestions" render={({ field }) => (<FormItem><FormLabel>Interview Questions (one per line)</FormLabel><FormControl><Textarea className="h-20 resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={jobForm.control} name="interviewAnswers" render={({ field }) => (<FormItem><FormLabel>Answer Notes (one per line)</FormLabel><FormControl><Textarea className="h-20 resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createJob.isPending || updateJob.isPending}>
                      {(createJob.isPending || updateJob.isPending) ? "Saving..." : "Save Job"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pipeline summary strip */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {([
          { key: "saved",        label: "Ready to Apply", icon: Briefcase,      tone: "text-slate-600 bg-slate-100",   count: pipeline.saved },
          { key: "applied",      label: "Applied",        icon: Clock3,          tone: "text-sky-600 bg-sky-100",       count: pipeline.applied },
          { key: "interviewing", label: "Interview",      icon: Sparkles,        tone: "text-amber-600 bg-amber-100",   count: pipeline.interviewing },
          { key: "offered",      label: "Waiting",        icon: CircleCheckBig,  tone: "text-purple-600 bg-purple-100", count: pipeline.offered },
          { key: "rejected",     label: "Rejected",       icon: XCircle,         tone: "text-rose-600 bg-rose-100",     count: pipeline.rejected },
        ] as const).map(({ key, label, icon: Icon, tone, count }) => (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
            className={`text-left rounded-2xl border transition-all p-4 flex items-center gap-3 ${statusFilter === key ? "border-primary ring-1 ring-primary bg-primary/5" : "border-[#ebe5d8] bg-[#fdfcf8] hover:border-primary/30"}`}>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}><Icon className="h-4 w-4" /></div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 leading-none">{label}</p>
              <p className="text-2xl font-bold text-slate-800 leading-tight mt-0.5">{count}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search + sort bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-[#e4ddd2] text-[14px]"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setSortByDeadline(v => !v)}
          className={`gap-2 text-[13px] rounded-xl ${sortByDeadline ? "border-emerald-400 text-emerald-700 bg-emerald-50" : ""}`}>
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortByDeadline ? "Sorted by deadline" : "Sort by deadline"}
        </Button>
        {(statusFilter !== "all" || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setSearch(""); }} className="text-[13px] text-muted-foreground">
            Clear filters
          </Button>
        )}
        <span className="ml-auto text-[13px] text-muted-foreground">{filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}</span>
      </div>

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        isLoading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/5">
            <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No jobs found</h3>
            <p className="text-muted-foreground text-[14px] mb-5">{jobs.length === 0 ? "Start tracking opportunities to manage your search." : "Try adjusting your filters."}</p>
            {jobs.length === 0 && <Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add First Job</Button>}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e4ddd2] overflow-hidden bg-white shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_2fr_auto] gap-0 bg-[#fdfcf8] border-b border-[#e4ddd2]">
              {["Job Title", "Company Name", "Apply Link / Website", "Status", "Feedback / Notes", ""].map((h, i) => (
                <div key={i} className={`px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${i === 5 ? "w-24 text-right" : ""}`}>{h}</div>
              ))}
            </div>

            {/* Table rows */}
            <div className="divide-y divide-[#f0ebe0]">
              {filteredJobs.map((job) => {
                const di = getDeadlineInfo(job.applyDate);
                const isExpanded = expandedRow === job.id;
                return (
                  <div key={job.id}>
                    <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_2fr_auto] gap-0 items-center hover:bg-[#fdfcf8] transition-colors group">
                      {/* Job Title */}
                      <div className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {job.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                          <button onClick={() => setExpandedRow(isExpanded ? null : job.id)}
                            className="text-[14px] font-semibold text-slate-800 hover:text-primary transition-colors text-left line-clamp-1">
                            {job.title}
                          </button>
                        </div>
                        {di && (
                          <span className={`mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${di.cls}`}>
                            <Clock className="h-2.5 w-2.5" />{di.label}
                          </span>
                        )}
                      </div>

                      {/* Company */}
                      <div className="px-4 py-3.5">
                        {job.company ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-[14px] text-slate-700 line-clamp-1">{job.company}</span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-muted-foreground italic">—</span>
                        )}
                      </div>

                      {/* Apply Link */}
                      <div className="px-4 py-3.5">
                        {job.url ? (
                          <a href={job.url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline font-medium"
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="line-clamp-1">Apply</span>
                          </a>
                        ) : (
                          <span className="text-[13px] text-muted-foreground italic">—</span>
                        )}
                      </div>

                      {/* Status — inline dropdown */}
                      <div className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <Select value={job.status} onValueChange={(val) => quickUpdateStatus.mutate({ id: job.id, status: val, job })}>
                          <SelectTrigger className="h-8 border-0 bg-transparent p-0 shadow-none focus:ring-0 w-auto gap-1.5">
                            <SelectValue asChild>
                              <StatusPill status={job.status} />
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="saved">Ready to Apply</SelectItem>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="interviewing">Interview</SelectItem>
                            <SelectItem value="offered">Waiting</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Feedback */}
                      <div className="px-4 py-3.5">
                        {job.notes ? (
                          <p className="text-[13px] text-slate-600 line-clamp-2">{job.notes}</p>
                        ) : (
                          <span className="text-[12px] text-muted-foreground italic">No feedback yet</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="px-3 py-3.5 flex items-center gap-1 justify-end w-24 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => { handleEditJob(job); setExpandedRow(null); }} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => { if (confirm("Delete this job?")) deleteJob.mutate(job.id); }} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <div className="border-t border-[#f0ebe0] bg-[#fdfcf8] px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-5">
                        {job.description && (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</p>
                            <p className="text-[13px] text-slate-700 leading-relaxed">{job.description}</p>
                          </div>
                        )}
                        {job.skills.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Required Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {job.skills.map((s, i) => <Badge key={i} variant="secondary" className="bg-primary/10 text-primary text-[12px]">{s}</Badge>)}
                            </div>
                          </div>
                        )}
                        {job.interviewQuestions.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Interview Questions</p>
                            <div className="space-y-1.5">
                              {job.interviewQuestions.slice(0, 3).map((q, i) => (
                                <div key={i} className="rounded-lg border border-[#ebe5d8] bg-white px-3 py-2 text-[13px] text-slate-700">
                                  <span className="font-medium">Q:</span> {q}
                                  {job.interviewAnswers[i] && <div className="mt-1 text-[12px] text-muted-foreground">A: {job.interviewAnswers[i]}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="md:col-span-3 flex items-center gap-3 pt-1 border-t border-[#ebe5d8]">
                          {job.applyDate && (
                            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Deadline: {format(parseLocalDate(job.applyDate!), "MMM d, yyyy")}
                            </div>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 ml-auto" onClick={() => togglePin.mutate(job.id)}>
                            <Pin className={`h-3.5 w-3.5 ${job.pinned ? "text-primary" : ""}`} />
                            {job.pinned ? "Unpin" : "Pin"}
                          </Button>
                          {job.url && (
                            <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1.5" asChild>
                              <a href={job.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />Open listing</a>
                            </Button>
                          )}
                          <Button size="sm" className="h-7 text-[12px] gap-1.5" onClick={() => { handleEditJob(job); setExpandedRow(null); }}>
                            <Pencil className="h-3.5 w-3.5" />Edit
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* CARDS VIEW */}
      {viewMode === "cards" && (
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}</div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/5">
            <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No jobs found</h3>
            <p className="text-muted-foreground text-[14px] mb-5">{jobs.length === 0 ? "Start tracking opportunities." : "Try adjusting your filters."}</p>
            {jobs.length === 0 && <Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add First Job</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filteredJobs.map((job) => {
              const di = getDeadlineInfo(job.applyDate);
              return (
                <div key={job.id} className="rounded-[24px] border border-[#e4ddd2] bg-white shadow-sm hover:shadow-md transition-shadow p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <StatusPill status={job.status} />
                      <p className="text-[17px] font-semibold text-slate-800 line-clamp-1 mt-1">{job.title}</p>
                      {job.company && (
                        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />{job.company}
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {job.applyDate && (
                          <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {format(parseLocalDate(job.applyDate!), "MMM d, yyyy")}
                          </div>
                        )}
                        {di && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${di.cls}`}>{di.label}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePin.mutate(job.id)}>
                        <Pin className={`h-4 w-4 ${job.pinned ? "text-primary" : "text-muted-foreground"}`} />
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
                  {job.description && <p className="text-[13px] text-foreground/70 line-clamp-2">{job.description}</p>}
                  {job.notes && (
                    <div className="rounded-xl bg-[#fdfcf8] border border-[#ebe5d8] px-3 py-2">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Feedback</p>
                      <p className="text-[13px] text-slate-700 line-clamp-2">{job.notes}</p>
                    </div>
                  )}
                  {job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#f0ebe0]">
                      {job.skills.map((s, i) => <Badge key={i} variant="secondary" className="bg-primary/10 text-primary text-[12px]">{s}</Badge>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Interview Q&A section */}
      <div className="rounded-[30px] border border-[#e4ddd2] bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />Interview Q&amp;A
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">{interviews.length} item{interviews.length !== 1 ? "s" : ""} saved</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2 text-[13px]" onClick={() => setIsInterviewOpen(true)}>
            <Plus className="h-3.5 w-3.5" />Add Q&amp;A
          </Button>
        </div>
        {interviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${categoryFilter === "all" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              All
            </button>
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter ? "all" : cat)}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${categoryFilter === cat ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {cat}
              </button>
            ))}
          </div>
        )}
        {interviewsLoading
          ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-[20px]" />)}</div>
          : filteredInterviews.length > 0
            ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredInterviews.map((item) => {
                  const isExp = expandedItems.has(item.id);
                  const catColor = item.category ? (CATEGORY_COLORS[item.category] ?? "bg-slate-100 text-slate-700") : "";
                  return (
                    <div key={item.id} className="rounded-[20px] border border-[#ebe5d8] bg-[#fdfcf8] p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-slate-800 leading-snug">{item.question}</p>
                          {item.category && (
                            <span className={`mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${catColor}`}>{item.category}</span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEditInterview(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Delete?")) deleteInterview.mutate(item.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      {item.answer && (
                        <div>
                          <button className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors" onClick={() => toggleExpand(item.id)}>
                            {isExp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            {isExp ? "Hide answer" : "Show answer"}
                          </button>
                          {isExp && (
                            <div className="mt-2 rounded-xl bg-white border border-[#e4ddd2] px-3 py-2.5 text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed">{item.answer}</div>
                          )}
                        </div>
                      )}
                      {!item.answer && <p className="text-[12px] text-muted-foreground italic">No answer yet.</p>}
                    </div>
                  );
                })}
              </div>
            )
            : (
              <div className="rounded-[20px] border border-dashed border-slate-200 p-10 text-center">
                <MessageSquare className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                <p className="text-[13px] text-muted-foreground">
                  {interviews.length === 0 ? "No Q&A saved yet. Click \"Add Q&A\" to start." : "No items match the selected filter."}
                </p>
              </div>
            )
        }
      </div>

      {/* Top Skills analytics */}
      {analytics && analytics.topSkills.length > 0 && (
        <div className="rounded-[30px] border border-[#e4ddd2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-slate-800">Most Demanded Skills</h2>
            <span className="text-[12px] text-slate-400">Across all tracked jobs</span>
          </div>
          <div className="space-y-2.5">
            {analytics.topSkills.slice(0, 8).map(({ skill, count }) => {
              const max = analytics.topSkills[0]?.count ?? 1;
              return (
                <div key={skill} className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-slate-700 w-32 shrink-0 truncate">{skill}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-[12px] text-muted-foreground w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
