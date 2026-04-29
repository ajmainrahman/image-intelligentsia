import { useMemo, useState, type KeyboardEvent } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Pencil, X, Check, Plus, AlertTriangle, Clock, Zap, ClipboardList } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

type Summary = {
  totalGoals: number; activeGoals: number; progressCompleted: number;
  progressInProgress: number; totalJobs: number; appliedJobs: number;
  pendingReminders: number; roadmapCompleted: number; roadmapTotal: number;
};
type Skill = { skill: string; count: number };
type ActivityItem = {
  id: number; type: "job"|"goal"|"progress"|"reminder"|"note"|"roadmap";
  title: string; action: string; createdAt: string;
};
type Reminder = {
  id: number; title: string; description: string | null; dueDate: string | null;
  priority: string; completed: boolean; category: string; createdAt: string;
};
type Profile = { tagline: string; about: string; expertise: string[]; skills: string[]; interests: string[] };

const ACTIVITY_META: Record<ActivityItem["type"], { label: string }> = {
  job: { label: "Job added" }, goal: { label: "Goal created" }, progress: { label: "Progress logged" },
  reminder: { label: "Reminder set" }, note: { label: "Note saved" }, roadmap: { label: "Milestone added" },
};
const FILTERS: { id: "all"|ActivityItem["type"]; label: string }[] = [
  { id: "all", label: "All" }, { id: "job", label: "Jobs" }, { id: "goal", label: "Goals" },
  { id: "progress", label: "Progress" }, { id: "reminder", label: "Reminders" }, { id: "note", label: "Notes" },
];
const serif = { fontFamily: "'DM Serif Display', serif", fontWeight: 400 };
const emptyProfile = (): Profile => ({ tagline: "", about: "", expertise: [], skills: [], interests: [] });

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const val = raw.trim().replace(/,$/, "");
    if (!val) return;
    if (values.some((v) => v.toLowerCase() === val.toLowerCase())) { setDraft(""); return; }
    onChange([...values, val]); setDraft("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); }
    else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-secondary p-2 min-h-[40px]">
      {values.map((v) => (
        <span key={v} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent text-primary">
          {v}
          <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-foreground transition-colors">
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} onBlur={() => add(draft)}
        placeholder={values.length === 0 ? placeholder : "Add more…"}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground" />
    </div>
  );
}

function DueWarningBanner() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["due-warnings"],
    queryFn: () => api<any>("/due-warnings"),
    refetchInterval: 5 * 60 * 1000,
    enabled: !!user,
  });
  if (!data) return null;
  const { overdueReminders = [], soonReminders = [], overdueGoals = [], soonGoals = [] } = data;
  const overdueCount = overdueReminders.length + overdueGoals.length;
  const soonCount = soonReminders.length + soonGoals.length;
  if (overdueCount === 0 && soonCount === 0) return null;
  return (
    <div className="space-y-2">
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">{overdueCount} item{overdueCount > 1 ? "s" : ""} overdue</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {overdueReminders.map((r: any) => (
                <Link href="/reminders" key={r.id}>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-200">⏰ {r.title}</span>
                </Link>
              ))}
              {overdueGoals.map((g: any) => (
                <Link href={`/goals/${g.id}`} key={g.id}>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-200">🎯 {g.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      {soonCount > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-700">{soonCount} item{soonCount > 1 ? "s" : ""} due in the next 7 days</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {soonReminders.map((r: any) => (
                <Link href="/reminders" key={r.id}>
                  <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-200">
                    ⏰ {r.title}{r.dueDate ? ` · ${format(new Date(r.dueDate), "MMM d")}` : ""}
                  </span>
                </Link>
              ))}
              {soonGoals.map((g: any) => (
                <Link href={`/goals/${g.id}`} key={g.id}>
                  <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-200">🎯 {g.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SkillsGapCard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["skills-gap"],
    queryFn: () => api<any>("/skills-gap"),
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });
  if (isLoading || !data || data.goalSkills.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h2 className="text-[15px] text-foreground mb-1 flex items-center gap-2" style={serif}>
        <Zap className="w-4 h-4 text-yellow-500" /> Skills Gap
      </h2>
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Coverage</span><span>{data.covered.length}/{data.goalSkills.length} skills</span>
        </div>
        <Progress value={data.coveragePercent} className="h-1.5" />
      </div>
      {data.gaps.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">Missing</p>
          <div className="flex flex-wrap gap-1.5">
            {data.gaps.map((s: string) => (
              <Badge key={s} className="bg-red-50 text-red-600 border border-red-200 text-xs">{s}</Badge>
            ))}
          </div>
        </div>
      )}
      {data.covered.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-green-400 mb-1">Covered</p>
          <div className="flex flex-wrap gap-1.5">
            {data.covered.map((s: string) => (
              <Badge key={s} className="bg-green-50 text-green-700 border border-green-200 text-xs">✓ {s}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Profile>(emptyProfile());
  const { data: profile, isLoading } = useQuery<Profile>({ queryKey: ["profile"], queryFn: () => api<Profile>("/profile") });
  const saveProfile = useMutation({
    mutationFn: (data: Profile) => api("/profile", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile"] }); setEditing(false); toast({ title: "Profile saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const startEdit = () => {
    setForm({ tagline: profile?.tagline ?? "", about: profile?.about ?? "", expertise: profile?.expertise ?? [], skills: profile?.skills ?? [], interests: profile?.interests ?? [] });
    setEditing(true);
  };
  const hasContent = profile && (profile.tagline || profile.about || profile.expertise.length > 0 || profile.skills.length > 0 || profile.interests.length > 0);
  if (isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (!editing && !hasContent) return (
    <div className="bg-card border border-dashed border-border rounded-2xl p-6 flex items-center justify-between">
      <div>
        <p className="text-[15px] font-medium text-foreground" style={serif}>Set up your profile</p>
        <p className="text-[13px] text-muted-foreground mt-0.5">Add your expertise, skills and interests.</p>
      </div>
      <Button onClick={startEdit} className="gap-2 text-[13px]"><Plus className="h-3.5 w-3.5" /> Add Profile</Button>
    </div>
  );
  if (editing) return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] text-foreground" style={serif}>Edit Profile</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="text-[12px]">Cancel</Button>
          <Button size="sm" onClick={() => saveProfile.mutate(form)} disabled={saveProfile.isPending} className="gap-1.5 text-[12px]">
            <Check className="h-3.5 w-3.5" />{saveProfile.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Tagline</label>
        <Input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="e.g. ML Engineer passionate about Computer Vision" className="bg-secondary border-border text-[13px]" />
      </div>
      <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">About</label>
        <Textarea value={form.about} onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))} placeholder="A short summary about your background…" className="resize-y bg-secondary border-border text-[13px] min-h-[100px]" rows={4} />
      </div>
      <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Expertise</label>
        <TagInput values={form.expertise} onChange={(v) => setForm((f) => ({ ...f, expertise: v }))} placeholder="e.g. Computer Vision, NLP… press Enter" />
      </div>
      <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Skills</label>
        <TagInput values={form.skills} onChange={(v) => setForm((f) => ({ ...f, skills: v }))} placeholder="e.g. Python, PyTorch… press Enter" />
      </div>
      <div className="space-y-1.5"><label className="text-[12px] font-medium text-muted-foreground">Interests</label>
        <TagInput values={form.interests} onChange={(v) => setForm((f) => ({ ...f, interests: v }))} placeholder="e.g. Robotics, Open Source… press Enter" />
      </div>
    </div>
  );
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          {profile?.tagline && <p className="text-[15px] font-medium text-foreground leading-snug">{profile.tagline}</p>}
          {profile?.about && <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">{profile.about}</p>}
        </div>
        <button onClick={startEdit} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-4"><Pencil className="h-3.5 w-3.5" /></button>
      </div>
      <div className="space-y-4">
        {profile?.expertise && profile.expertise.length > 0 && (
          <div><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Expertise</p>
            <div className="flex flex-wrap gap-1.5">{profile.expertise.map((e) => <span key={e} className="text-[12px] px-3 py-1 rounded-full bg-primary text-primary-foreground font-medium">{e}</span>)}</div>
          </div>
        )}
        {profile?.skills && profile.skills.length > 0 && (
          <div><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">{profile.skills.map((s) => <span key={s} className="text-[12px] px-3 py-1 rounded-full bg-accent text-primary">{s}</span>)}</div>
          </div>
        )}
        {profile?.interests && profile.interests.length > 0 && (
          <div><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Interests</p>
            <div className="flex flex-wrap gap-1.5">{profile.interests.map((i) => <span key={i} className="text-[12px] px-3 py-1 rounded-full bg-secondary text-muted-foreground border border-border">{i}</span>)}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [filter, setFilter] = useState<typeof FILTERS[number]["id"]>("all");
  const { data: summary, isLoading: isLoadingSummary } = useQuery<Summary>({ queryKey: ["dashboard-summary"], queryFn: () => api<Summary>("/dashboard/summary") });
  const { data: skills, isLoading: isLoadingSkills } = useQuery<Skill[]>({ queryKey: ["dashboard-skills"], queryFn: () => api<Skill[]>("/dashboard/top-skills") });
  const { data: activity, isLoading: isLoadingActivity } = useQuery<ActivityItem[]>({ queryKey: ["activity"], queryFn: () => api<ActivityItem[]>("/activity?limit=20") });
  const { data: reminders, isLoading: isLoadingReminders } = useQuery<Reminder[]>({ queryKey: ["dashboard-reminders"], queryFn: () => api<Reminder[]>("/reminders") });

  const recentReminder = reminders?.filter((r) => !r.completed).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const filteredActivity = useMemo(() => { const list = activity ?? []; return filter === "all" ? list : list.filter((item) => item.type === filter); }, [activity, filter]);
  const roadmapPct = summary && summary.roadmapTotal > 0 ? Math.round((summary.roadmapCompleted / summary.roadmapTotal) * 100) : 0;

  return (
    <div className="space-y-8 page-enter">
      <div>
        <h1 className="text-[28px] text-foreground leading-tight" style={serif}>Your overview</h1>
        <p className="text-[14px] text-muted-foreground mt-1.5">Here's where things stand today.</p>
      </div>

      {/* Due Warning Banner */}
      <DueWarningBanner />

      {/* Weekly Review Link */}
      <div className="flex justify-end">
        <Link href="/weekly-review">
          <Button variant="outline" size="sm" className="gap-2 text-[13px]">
            <ClipboardList className="h-3.5 w-3.5" /> Weekly Review
          </Button>
        </Link>
      </div>

      <ProfileSection />

      {isLoadingSummary ? (
        <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Active goals", value: summary.activeGoals, hint: `of ${summary.totalGoals} total` },
            { label: "Learning completed", value: summary.progressCompleted, hint: `${summary.progressInProgress} in progress` },
            { label: "Jobs applied", value: summary.appliedJobs, hint: `of ${summary.totalJobs} saved` },
            { label: "Pending reminders", value: summary.pendingReminders, hint: "awaiting action" },
          ].map((stat) => (
            <div key={stat.label} className="bg-secondary rounded-xl px-5 py-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{stat.label}</p>
              <p className="text-[28px] text-foreground leading-none" style={serif}>{stat.value}</p>
              <p className="text-[12px] text-muted-foreground mt-1.5">{stat.hint}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity timeline */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[17px] text-foreground" style={serif}>Recent activity</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Last 20 events across the app</p>
              </div>
              <Link href="/activity" className="text-[12px] text-primary hover:underline underline-offset-2">View all</Link>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-6">
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${filter === f.id ? "bg-accent text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {isLoadingActivity ? (
              <div className="space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filteredActivity.length > 0 ? (
              <ol className="relative border-l border-border pl-6 space-y-5">
                <AnimatePresence initial={false}>
                  {filteredActivity.map((item, index) => {
                    const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.note;
                    return (
                      <motion.li key={`${item.type}-${item.id}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.35) }} className="relative">
                        <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-primary/40 ring-2 ring-background" />
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-[11px] font-medium text-primary uppercase tracking-wide">{meta.label}</span>
                          <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-foreground line-clamp-1">{item.title}</p>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ol>
            ) : (
              <div className="flex items-center justify-center py-12 text-center">
                <p className="text-[13px] text-muted-foreground">No activity in this filter yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Skills Gap */}
          <SkillsGapCard />

          {/* Reminder */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-[15px] text-foreground mb-4" style={serif}>Don't forget</h2>
            {isLoadingReminders ? <Skeleton className="h-20 w-full rounded-xl" /> : recentReminder ? (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-foreground">{recentReminder.title}</p>
                {recentReminder.description && <p className="text-[12px] text-muted-foreground line-clamp-2">{recentReminder.description}</p>}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{recentReminder.category}</span>
                  <span className="px-2 py-0.5 rounded-full bg-accent text-primary capitalize">{recentReminder.priority} priority</span>
                  {recentReminder.dueDate && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />{format(new Date(recentReminder.dueDate), "MMM d")}
                    </span>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild className="w-full text-[12px] mt-1"><Link href="/reminders">View reminders</Link></Button>
              </div>
            ) : <p className="text-[12px] text-muted-foreground">No pending reminders right now.</p>}
          </div>

          {/* Top skills */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-[15px] text-foreground mb-4" style={serif}>Skills in demand</h2>
            {isLoadingSkills ? (
              <div className="space-y-2.5">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
            ) : skills && skills.length > 0 ? (
              <div className="space-y-2">
                {skills.slice(0, 6).map((skill, index) => (
                  <div key={skill.skill} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] text-muted-foreground w-4 text-right">{index + 1}</span>
                      <span className="text-[13px] text-foreground capitalize">{skill.skill}</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-primary font-medium">{skill.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-[12px] text-muted-foreground">Save jobs to see required skills here.</p>}
          </div>

          {/* Roadmap progress */}
          {summary && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="text-[15px] text-foreground mb-1" style={serif}>Roadmap progress</h2>
              <p className="text-[12px] text-muted-foreground mb-4">{summary.roadmapCompleted} of {summary.roadmapTotal} milestones complete</p>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${roadmapPct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 text-right">{roadmapPct}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
