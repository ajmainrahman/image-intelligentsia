import { useMemo, useState, useEffect, useRef, type KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Target, BookOpen, CheckCircle2, Circle, ChevronRight, Sparkles,
  TrendingUp, AlertCircle, Link as LinkIcon, RotateCcw, Plus, X,
  Pencil, BookPlus, Check, GraduationCap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Goal = { id: number; title: string; targetRole: string; skills: string[]; progress: number };
type ProgressEntry = { id: number; title: string; category: string; status: string; goalId: number | null };
type CustomSkill = { skill: string; priority: "core" | "bonus" };

// ─── Hardcoded role → skills map ─────────────────────────────────────────────
const ROLE_SKILLS: Record<string, { skill: string; priority: "core" | "bonus" }[]> = {
  "Software Engineer": [
    { skill: "Data Structures & Algorithms", priority: "core" },
    { skill: "System Design", priority: "core" },
    { skill: "Git / Version Control", priority: "core" },
    { skill: "REST APIs", priority: "core" },
    { skill: "SQL Databases", priority: "core" },
    { skill: "Unit Testing / TDD", priority: "core" },
    { skill: "Python or JavaScript", priority: "core" },
    { skill: "Docker & Containers", priority: "bonus" },
    { skill: "Cloud (AWS/GCP/Azure)", priority: "bonus" },
    { skill: "CI/CD Pipelines", priority: "bonus" },
    { skill: "Agile / Scrum", priority: "bonus" },
    { skill: "Code Review", priority: "bonus" },
  ],
  "Frontend Developer": [
    { skill: "HTML & CSS", priority: "core" },
    { skill: "JavaScript / TypeScript", priority: "core" },
    { skill: "React / Vue / Angular", priority: "core" },
    { skill: "Responsive Design", priority: "core" },
    { skill: "Accessibility (WCAG)", priority: "core" },
    { skill: "Browser DevTools", priority: "core" },
    { skill: "State Management", priority: "core" },
    { skill: "Performance Optimization", priority: "bonus" },
    { skill: "Testing (Jest / Vitest)", priority: "bonus" },
    { skill: "WebSockets / Real-time", priority: "bonus" },
    { skill: "Design Systems", priority: "bonus" },
  ],
  "Backend Developer": [
    { skill: "REST API Design", priority: "core" },
    { skill: "SQL Databases", priority: "core" },
    { skill: "Authentication & Security", priority: "core" },
    { skill: "Node.js / Python / Java / Go", priority: "core" },
    { skill: "Caching (Redis)", priority: "core" },
    { skill: "Message Queues", priority: "core" },
    { skill: "Database Design", priority: "core" },
    { skill: "Docker / Kubernetes", priority: "bonus" },
    { skill: "Microservices Architecture", priority: "bonus" },
    { skill: "GraphQL", priority: "bonus" },
    { skill: "Monitoring & Logging", priority: "bonus" },
  ],
  "Machine Learning Engineer": [
    { skill: "Python", priority: "core" },
    { skill: "Machine Learning Fundamentals", priority: "core" },
    { skill: "Deep Learning / Neural Networks", priority: "core" },
    { skill: "PyTorch or TensorFlow", priority: "core" },
    { skill: "Data Preprocessing", priority: "core" },
    { skill: "Model Evaluation & Metrics", priority: "core" },
    { skill: "Feature Engineering", priority: "core" },
    { skill: "MLOps / Model Deployment", priority: "bonus" },
    { skill: "NLP or Computer Vision", priority: "bonus" },
    { skill: "SQL & Data Pipelines", priority: "bonus" },
    { skill: "Cloud ML Platforms", priority: "bonus" },
    { skill: "Experiment Tracking (MLflow)", priority: "bonus" },
  ],
  "Data Scientist": [
    { skill: "Python & Pandas", priority: "core" },
    { skill: "Statistics & Probability", priority: "core" },
    { skill: "Machine Learning", priority: "core" },
    { skill: "Data Visualization", priority: "core" },
    { skill: "SQL", priority: "core" },
    { skill: "A/B Testing", priority: "core" },
    { skill: "Jupyter Notebooks", priority: "core" },
    { skill: "Hypothesis Testing", priority: "bonus" },
    { skill: "Big Data (Spark)", priority: "bonus" },
    { skill: "Communication & Storytelling", priority: "bonus" },
    { skill: "Time Series Analysis", priority: "bonus" },
  ],
  "Data Analyst": [
    { skill: "SQL", priority: "core" },
    { skill: "Excel / Google Sheets", priority: "core" },
    { skill: "Data Visualization (Tableau/Power BI)", priority: "core" },
    { skill: "Statistics Fundamentals", priority: "core" },
    { skill: "Python or R (basics)", priority: "core" },
    { skill: "Business Acumen", priority: "core" },
    { skill: "ETL / Data Pipelines", priority: "bonus" },
    { skill: "Dashboard Design", priority: "bonus" },
    { skill: "A/B Testing", priority: "bonus" },
    { skill: "Communication & Reporting", priority: "bonus" },
  ],
  "DevOps Engineer": [
    { skill: "Linux & Bash Scripting", priority: "core" },
    { skill: "Docker & Kubernetes", priority: "core" },
    { skill: "CI/CD Pipelines", priority: "core" },
    { skill: "Cloud (AWS/GCP/Azure)", priority: "core" },
    { skill: "Infrastructure as Code (Terraform)", priority: "core" },
    { skill: "Networking Fundamentals", priority: "core" },
    { skill: "Monitoring (Prometheus/Grafana)", priority: "core" },
    { skill: "Security Best Practices", priority: "bonus" },
    { skill: "GitOps", priority: "bonus" },
    { skill: "Site Reliability Engineering", priority: "bonus" },
  ],
  "UX Designer": [
    { skill: "User Research", priority: "core" },
    { skill: "Wireframing & Prototyping", priority: "core" },
    { skill: "Figma / Sketch", priority: "core" },
    { skill: "Usability Testing", priority: "core" },
    { skill: "Information Architecture", priority: "core" },
    { skill: "Visual Design Principles", priority: "core" },
    { skill: "Design Systems", priority: "core" },
    { skill: "Interaction Design", priority: "bonus" },
    { skill: "Accessibility Design", priority: "bonus" },
    { skill: "Design Thinking", priority: "bonus" },
  ],
  "UX Researcher": [
    { skill: "Qualitative Research Methods", priority: "core" },
    { skill: "User Interviews", priority: "core" },
    { skill: "Usability Testing", priority: "core" },
    { skill: "Survey Design", priority: "core" },
    { skill: "Data Analysis", priority: "core" },
    { skill: "Report Writing", priority: "core" },
    { skill: "Persona Creation", priority: "core" },
    { skill: "A/B Testing", priority: "bonus" },
    { skill: "Card Sorting", priority: "bonus" },
    { skill: "Eye Tracking / Heatmaps", priority: "bonus" },
  ],
  "Product Manager": [
    { skill: "Product Strategy", priority: "core" },
    { skill: "Roadmap Planning", priority: "core" },
    { skill: "User Story Writing", priority: "core" },
    { skill: "Data-Driven Decision Making", priority: "core" },
    { skill: "Stakeholder Management", priority: "core" },
    { skill: "Agile / Scrum", priority: "core" },
    { skill: "Market Research", priority: "core" },
    { skill: "SQL (basics)", priority: "bonus" },
    { skill: "A/B Testing", priority: "bonus" },
    { skill: "Pricing Strategy", priority: "bonus" },
    { skill: "Go-to-Market Planning", priority: "bonus" },
  ],
  "iOS Developer": [
    { skill: "Swift", priority: "core" },
    { skill: "SwiftUI or UIKit", priority: "core" },
    { skill: "Xcode", priority: "core" },
    { skill: "REST APIs & Networking", priority: "core" },
    { skill: "Core Data", priority: "core" },
    { skill: "App Store Deployment", priority: "core" },
    { skill: "Memory Management / ARC", priority: "core" },
    { skill: "Combine / async-await", priority: "bonus" },
    { skill: "Unit & UI Testing", priority: "bonus" },
    { skill: "Objective-C basics", priority: "bonus" },
  ],
  "Android Developer": [
    { skill: "Kotlin", priority: "core" },
    { skill: "Jetpack Compose or XML Views", priority: "core" },
    { skill: "Android Studio", priority: "core" },
    { skill: "REST APIs & Retrofit", priority: "core" },
    { skill: "Room Database", priority: "core" },
    { skill: "Google Play Deployment", priority: "core" },
    { skill: "MVVM Architecture", priority: "core" },
    { skill: "Coroutines / Flow", priority: "bonus" },
    { skill: "Unit Testing (JUnit)", priority: "bonus" },
    { skill: "Firebase Integration", priority: "bonus" },
  ],
  "QA Engineer": [
    { skill: "Manual Testing", priority: "core" },
    { skill: "Test Case Design", priority: "core" },
    { skill: "Bug Reporting", priority: "core" },
    { skill: "Selenium / Playwright", priority: "core" },
    { skill: "API Testing (Postman)", priority: "core" },
    { skill: "SQL Basics", priority: "core" },
    { skill: "Agile / Scrum", priority: "core" },
    { skill: "CI/CD Integration", priority: "bonus" },
    { skill: "Performance Testing (JMeter)", priority: "bonus" },
    { skill: "Mobile Testing", priority: "bonus" },
  ],
  "Technical Writer": [
    { skill: "Technical Documentation", priority: "core" },
    { skill: "Markdown / RST", priority: "core" },
    { skill: "API Documentation", priority: "core" },
    { skill: "Developer Empathy", priority: "core" },
    { skill: "Docs-as-Code", priority: "core" },
    { skill: "Information Architecture", priority: "core" },
    { skill: "Code Reading (any language)", priority: "core" },
    { skill: "Docs Site Tools (Docusaurus/Sphinx)", priority: "bonus" },
    { skill: "UX Writing", priority: "bonus" },
    { skill: "Video/Screenshot creation", priority: "bonus" },
  ],
  "Full Stack Developer": [
    { skill: "JavaScript / TypeScript", priority: "core" },
    { skill: "React / Vue (frontend)", priority: "core" },
    { skill: "Node.js / Express (backend)", priority: "core" },
    { skill: "SQL Databases", priority: "core" },
    { skill: "REST API Design", priority: "core" },
    { skill: "Authentication & Sessions", priority: "core" },
    { skill: "HTML & CSS", priority: "core" },
    { skill: "Docker", priority: "bonus" },
    { skill: "GraphQL", priority: "bonus" },
    { skill: "Cloud Deployment", priority: "bonus" },
    { skill: "CI/CD", priority: "bonus" },
  ],
};

const CATEGORIES = [
  { value: "course", label: "Course" },
  { value: "ai_tool", label: "AI Tool" },
  { value: "project", label: "Project" },
  { value: "certification", label: "Certification" },
  { value: "reading", label: "Reading" },
  { value: "practice", label: "Practice" },
  { value: "other", label: "Other" },
];

// ─── Persistence ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "skill-map-v2";
type SavedState = { role: string; checkedSkills: string[]; customSkills: CustomSkill[] };
function loadSaved(): SavedState | null {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"); } catch { return null; }
}
function persist(s: SavedState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

// ─── Quick-Log Learning dialog form ─────────────────────────────────────────
type LearningForm = { title: string; category: string; durationHours: string; status: string; goalId: string; notes: string };
const emptyLearningForm = (skill = ""): LearningForm => ({ title: skill, category: "course", durationHours: "", status: "in_progress", goalId: "", notes: "" });

// ─── SkillRow component ───────────────────────────────────────────────────────
function SkillRow({
  skill, priority, has, isCustom, isLearning, editMode, allSkills,
  onToggle, onRemove, onLog,
}: {
  skill: string; priority: "core" | "bonus"; has: boolean; isCustom: boolean;
  isLearning: boolean; editMode: boolean; allSkills: Set<string>;
  onToggle: () => void; onRemove: () => void; onLog: () => void;
}) {
  return (
    <div className={`group flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
      has
        ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
        : "bg-background border-border hover:border-primary/30"
    }`}>
      {/* Check toggle */}
      <button
        onClick={onToggle}
        aria-label={has ? `Uncheck ${skill}` : `Check ${skill}`}
        className={`shrink-0 transition-colors ${has ? "text-emerald-600" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
      >
        {has ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </button>

      {/* Skill name */}
      <span className={`flex-1 text-[13px] font-medium leading-tight ${has ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
        {skill}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {isCustom && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-primary/40 text-primary bg-primary/5">
            custom
          </span>
        )}
        {isLearning && !has && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
            in learning
          </span>
        )}
        {!has && priority === "core" && (
          <span className="text-[10px] text-rose-500 font-semibold">gap</span>
        )}
        {!has && priority === "bonus" && (
          <span className="text-[10px] text-amber-500 font-medium">bonus</span>
        )}
      </div>

      {/* Actions (visible on hover or in editMode) */}
      <div className={`flex items-center gap-1 transition-opacity shrink-0 ${editMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        {!has && (
          <button
            onClick={onLog}
            title="Log a learning entry for this skill"
            aria-label={`Log learning for ${skill}`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <BookPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Log</span>
          </button>
        )}
        {isCustom && editMode && (
          <button
            onClick={onRemove}
            title={`Remove "${skill}"`}
            aria-label={`Remove ${skill}`}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SkillMapPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saved = useMemo(() => loadSaved(), []);
  const [selectedRole, setSelectedRole] = useState<string>(saved?.role ?? "");
  const [checkedSkills, setCheckedSkills] = useState<Set<string>>(new Set(saved?.checkedSkills ?? []));
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>(saved?.customSkills ?? []);
  const [editMode, setEditMode] = useState(false);

  // Custom skill add form
  const [customDraft, setCustomDraft] = useState("");
  const [customPriority, setCustomPriority] = useState<"core" | "bonus">("core");
  const customInputRef = useRef<HTMLInputElement>(null);

  // Quick-log learning dialog
  const [logDialogSkill, setLogDialogSkill] = useState<string | null>(null);
  const [learningForm, setLearningForm] = useState<LearningForm>(emptyLearningForm());

  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });
  const { data: progressEntries = [] } = useQuery<ProgressEntry[]>({ queryKey: ["progress"], queryFn: () => api<ProgressEntry[]>("/progress") });

  const createProgress = useMutation({
    mutationFn: (data: object) => api("/progress", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      setLogDialogSkill(null);
      toast({ title: "Learning entry added!", description: "It will appear in your Learning log." });
    },
    onError: () => toast({ title: "Could not save entry", variant: "destructive" }),
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (selectedRole) {
      persist({ role: selectedRole, checkedSkills: [...checkedSkills], customSkills });
    }
  }, [selectedRole, checkedSkills, customSkills]);

  const roleSkills = useMemo(() => ROLE_SKILLS[selectedRole] ?? [], [selectedRole]);
  const allSkillsForRole = useMemo(() => {
    const names = new Set(roleSkills.map(s => s.skill));
    customSkills.forEach(c => names.add(c.skill));
    return names;
  }, [roleSkills, customSkills]);

  const coreSkills = useMemo(() => [
    ...roleSkills.filter(s => s.priority === "core"),
    ...customSkills.filter(c => c.priority === "core"),
  ], [roleSkills, customSkills]);

  const bonusSkills = useMemo(() => [
    ...roleSkills.filter(s => s.priority === "bonus"),
    ...customSkills.filter(c => c.priority === "bonus"),
  ], [roleSkills, customSkills]);

  const toggle = (skill: string) => {
    setCheckedSkills(prev => { const n = new Set(prev); n.has(skill) ? n.delete(skill) : n.add(skill); return n; });
  };

  const coreTotal = coreSkills.length;
  const coreDone = coreSkills.filter(s => checkedSkills.has(s.skill)).length;
  const bonusDone = bonusSkills.filter(s => checkedSkills.has(s.skill)).length;
  const maxScore = coreTotal * 2 + bonusSkills.length;
  const score = coreDone * 2 + bonusDone;
  const jobReadyPct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const gapSkills = useMemo(() =>
    [...coreSkills, ...bonusSkills].filter(s => !checkedSkills.has(s.skill)),
    [coreSkills, bonusSkills, checkedSkills]
  );
  const coreGaps = gapSkills.filter(s => s.priority === "core");

  // Cross-reference with goals / learning
  const goalSuggestions = useMemo(() => {
    if (!gapSkills.length) return [];
    const gs = new Set(gapSkills.map(s => s.skill.toLowerCase()));
    return goals
      .filter(g => g.skills.some(sk => gs.has(sk.toLowerCase())))
      .map(g => ({ goal: g, matchedSkills: g.skills.filter(sk => gs.has(sk.toLowerCase())) }))
      .slice(0, 3);
  }, [goals, gapSkills]);

  const learningMatches = useMemo(() => {
    if (!gapSkills.length) return [];
    return progressEntries
      .filter(e => gapSkills.some(g => e.title.toLowerCase().includes(g.skill.toLowerCase()) || g.skill.toLowerCase().includes(e.title.toLowerCase())))
      .slice(0, 5);
  }, [progressEntries, gapSkills]);

  const studyPlan = coreGaps.slice(0, 3);
  const scoreColor = jobReadyPct >= 80 ? "text-emerald-600" : jobReadyPct >= 50 ? "text-amber-600" : "text-rose-600";
  const scoreBg = jobReadyPct >= 80 ? "bg-emerald-500" : jobReadyPct >= 50 ? "bg-amber-500" : "bg-rose-500";

  // ─ Add custom skill ─
  const addCustomSkill = () => {
    const skill = customDraft.trim();
    if (!skill) return;
    if (allSkillsForRole.has(skill)) {
      toast({ title: "Skill already in the list", variant: "destructive" }); return;
    }
    setCustomSkills(prev => [...prev, { skill, priority: customPriority }]);
    setCustomDraft("");
    customInputRef.current?.focus();
    toast({ title: `"${skill}" added as a ${customPriority} skill` });
  };

  const removeCustomSkill = (skill: string) => {
    setCustomSkills(prev => prev.filter(c => c.skill !== skill));
    setCheckedSkills(prev => { const n = new Set(prev); n.delete(skill); return n; });
    toast({ title: `"${skill}" removed` });
  };

  const handleCustomKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); }
  };

  // ─ Open log dialog ─
  const openLog = (skill: string) => {
    setLearningForm(emptyLearningForm(skill));
    setLogDialogSkill(skill);
  };

  // ─ Submit learning entry ─
  const submitLearning = () => {
    if (!learningForm.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    createProgress.mutate({
      title: learningForm.title.trim(),
      category: learningForm.category,
      durationHours: learningForm.durationHours ? Number(learningForm.durationHours) : 0,
      status: learningForm.status,
      goalId: learningForm.goalId ? Number(learningForm.goalId) : null,
      notes: learningForm.notes.trim() || null,
    });
  };

  // ─ Reset ─
  const reset = () => {
    setSelectedRole(""); setCheckedSkills(new Set()); setCustomSkills([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isCustomSet = new Set(customSkills.map(c => c.skill));

  return (
    <div className="space-y-8 page-enter">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold text-foreground leading-tight">Skill Map</h1>
          <p className="text-[14px] text-muted-foreground mt-1.5">Select a role, check off your skills, add custom ones, and log learning — all in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedRole && (
            <>
              <Button
                variant="outline" size="sm"
                onClick={() => setEditMode(v => !v)}
                className={`gap-1.5 text-[12px] ${editMode ? "border-primary text-primary bg-primary/5" : ""}`}
              >
                <Pencil className="h-3.5 w-3.5" />
                {editMode ? "Done editing" : "Edit skills"}
              </Button>
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 text-[12px]">
                <RotateCcw className="h-3.5 w-3.5" />Reset
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Role selector ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <label className="text-[13px] font-medium text-muted-foreground block mb-2">Target Role</label>
        <Select value={selectedRole} onValueChange={v => { setSelectedRole(v); setCustomSkills([]); setCheckedSkills(new Set()); }}>
          <SelectTrigger className="max-w-sm text-[13px]">
            <SelectValue placeholder="Choose a role to analyze…" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(ROLE_SKILLS).sort().map(role => (
              <SelectItem key={role} value={role}>{role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRole && (
        <>
          {/* ── Score banner ── */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <p className="text-[13px] text-muted-foreground mb-0.5">Your job-readiness score for</p>
                <h2 className="text-[20px] font-bold text-foreground">{selectedRole}</h2>
              </div>
              <div className="text-right">
                <p className={`text-[48px] font-bold leading-none ${scoreColor}`}>{jobReadyPct}%</p>
                <p className="text-[12px] text-muted-foreground">job-ready</p>
              </div>
            </div>
            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden mb-3">
              <div className={`h-full ${scoreBg} rounded-full transition-all duration-700`} style={{ width: `${jobReadyPct}%` }} />
            </div>
            <div className="flex items-center gap-6 text-[12px] flex-wrap">
              <span className="text-muted-foreground"><strong className="text-foreground">{coreDone}/{coreTotal}</strong> core</span>
              <span className="text-muted-foreground"><strong className="text-foreground">{bonusDone}/{bonusSkills.length}</strong> bonus</span>
              <span className="text-muted-foreground"><strong className="text-foreground">{coreGaps.length}</strong> critical gaps</span>
              <span className="text-muted-foreground"><strong className="text-foreground">{customSkills.length}</strong> custom skills</span>
              {jobReadyPct >= 80 && <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Ready to apply!</span>}
              {jobReadyPct > 0 && jobReadyPct < 50 && <span className="text-amber-600 font-medium flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />Focus on core gaps first</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ── Left: Skills checklists ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Core skills */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-foreground">
                    Core Skills <span className="text-[12px] text-muted-foreground font-normal">(required — count double)</span>
                  </h3>
                  <span className="text-[12px] text-muted-foreground">{coreDone}/{coreTotal} checked</span>
                </div>
                <div className="space-y-2">
                  {coreSkills.map(({ skill }) => (
                    <SkillRow
                      key={skill} skill={skill} priority="core"
                      has={checkedSkills.has(skill)}
                      isCustom={isCustomSet.has(skill)}
                      isLearning={learningMatches.some(e => e.title.toLowerCase().includes(skill.toLowerCase()))}
                      editMode={editMode}
                      allSkills={allSkillsForRole}
                      onToggle={() => toggle(skill)}
                      onRemove={() => removeCustomSkill(skill)}
                      onLog={() => openLog(skill)}
                    />
                  ))}
                  {coreSkills.length === 0 && (
                    <p className="text-[12px] text-muted-foreground py-3 text-center">No core skills yet. Add some below.</p>
                  )}
                </div>
              </div>

              {/* Bonus skills */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-foreground">
                    Bonus Skills <span className="text-[12px] text-muted-foreground font-normal">(nice to have)</span>
                  </h3>
                  <span className="text-[12px] text-muted-foreground">{bonusDone}/{bonusSkills.length} checked</span>
                </div>
                <div className="space-y-2">
                  {bonusSkills.map(({ skill }) => (
                    <SkillRow
                      key={skill} skill={skill} priority="bonus"
                      has={checkedSkills.has(skill)}
                      isCustom={isCustomSet.has(skill)}
                      isLearning={learningMatches.some(e => e.title.toLowerCase().includes(skill.toLowerCase()))}
                      editMode={editMode}
                      allSkills={allSkillsForRole}
                      onToggle={() => toggle(skill)}
                      onRemove={() => removeCustomSkill(skill)}
                      onLog={() => openLog(skill)}
                    />
                  ))}
                  {bonusSkills.length === 0 && (
                    <p className="text-[12px] text-muted-foreground py-3 text-center">No bonus skills yet.</p>
                  )}
                </div>
              </div>

              {/* ── Add custom skill ── */}
              <div className="bg-card border border-dashed border-primary/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="h-4 w-4 text-primary" />
                  <h3 className="text-[14px] font-semibold text-foreground">Add a custom skill</h3>
                </div>
                <p className="text-[12px] text-muted-foreground mb-4">
                  Add any skill not in the default list — e.g. a specific framework, tool, or soft skill relevant to your target role.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    ref={customInputRef}
                    value={customDraft}
                    onChange={e => setCustomDraft(e.target.value)}
                    onKeyDown={handleCustomKeyDown}
                    placeholder="e.g. Kubernetes, Figma, Leadership…"
                    className="flex-1 min-w-[200px] text-[13px]"
                  />
                  <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0">
                    <button
                      onClick={() => setCustomPriority("core")}
                      className={`px-3 py-2 text-[12px] font-medium transition-colors ${customPriority === "core" ? "bg-rose-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}
                    >
                      Core
                    </button>
                    <button
                      onClick={() => setCustomPriority("bonus")}
                      className={`px-3 py-2 text-[12px] font-medium transition-colors ${customPriority === "bonus" ? "bg-amber-400 text-white" : "text-muted-foreground hover:bg-secondary"}`}
                    >
                      Bonus
                    </button>
                  </div>
                  <Button onClick={addCustomSkill} disabled={!customDraft.trim()} className="gap-1.5 text-[13px] shrink-0">
                    <Plus className="h-3.5 w-3.5" />Add skill
                  </Button>
                </div>
                {customSkills.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your custom skills ({customSkills.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {customSkills.map(c => (
                        <span key={c.skill} className={`flex items-center gap-1.5 text-[12px] px-3 py-1 rounded-full border font-medium ${c.priority === "core" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                          {checkedSkills.has(c.skill) && <Check className="h-3 w-3" />}
                          {c.skill}
                          <span className="text-[10px] opacity-60">({c.priority})</span>
                          <button onClick={() => removeCustomSkill(c.skill)} aria-label={`Remove ${c.skill}`} className="hover:text-rose-600 transition-colors ml-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Study plan + suggestions ── */}
            <div className="space-y-4">

              {/* Study plan */}
              {studyPlan.length > 0 ? (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h3 className="text-[14px] font-semibold text-foreground">Study Plan</h3>
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-3">Top core gaps — start here:</p>
                  <div className="space-y-2">
                    {studyPlan.map((s, i) => (
                      <div key={s.skill} className="flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/40 px-3 py-2.5">
                        <span className="text-[11px] font-bold text-rose-400 mt-0.5 shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-rose-700 dark:text-rose-400 line-clamp-1">{s.skill}</p>
                          <p className="text-[11px] text-rose-500 mt-0.5">30 min/day focused practice</p>
                        </div>
                        <button
                          onClick={() => openLog(s.skill)}
                          title="Log a learning entry"
                          className="shrink-0 p-1 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors"
                          aria-label={`Log learning for ${s.skill}`}
                        >
                          <BookPlus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : checkedSkills.size > 0 ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-2xl p-5 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-[14px] font-semibold text-emerald-700">No core gaps!</p>
                  <p className="text-[12px] text-emerald-600 mt-1">Work on bonus skills to get to 100%.</p>
                </div>
              ) : null}

              {/* Goals covering gaps */}
              {goalSuggestions.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-primary" />
                    <h3 className="text-[14px] font-semibold text-foreground">Goals covering gaps</h3>
                  </div>
                  <div className="space-y-2">
                    {goalSuggestions.map(({ goal, matchedSkills }) => (
                      <Link key={goal.id} href={`/goals/${goal.id}`}>
                        <div className="rounded-xl border border-border hover:border-primary/30 bg-secondary/50 px-3 py-2.5 transition-colors cursor-pointer group">
                          <p className="text-[12px] font-medium text-foreground line-clamp-1 group-hover:text-primary">{goal.title}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {matchedSkills.slice(0, 3).map(sk => (
                              <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{sk}</span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning matches */}
              {learningMatches.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-sky-500" />
                    <h3 className="text-[14px] font-semibold text-foreground">Relevant learning</h3>
                  </div>
                  <div className="space-y-2">
                    {learningMatches.map(entry => (
                      <div key={entry.id} className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
                        <p className="text-[12px] font-medium text-foreground line-clamp-1">{entry.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground capitalize">{entry.category}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            entry.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                            entry.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>{entry.status.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/progress">
                    <Button variant="ghost" size="sm" className="w-full mt-2 text-[12px] text-muted-foreground">
                      View all learning <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}

              {/* Quick link to goals */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <p className="text-[12px] text-muted-foreground">Build skills into your career plan:</p>
                <Link href="/goals">
                  <Button variant="outline" size="sm" className="w-full text-[12px] gap-2">
                    <LinkIcon className="h-3.5 w-3.5" />Open Goals
                  </Button>
                </Link>
                <Link href="/progress">
                  <Button variant="outline" size="sm" className="w-full text-[12px] gap-2">
                    <GraduationCap className="h-3.5 w-3.5" />Open Learning
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {!selectedRole && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl">
          <Sparkles className="h-10 w-10 text-muted-foreground/25 mb-3" />
          <p className="text-[16px] font-semibold text-foreground mb-1">Select a role to get started</p>
          <p className="text-[13px] text-muted-foreground max-w-xs">Choose a target role above to see the required skills, track what you know, and log learning entries directly.</p>
        </div>
      )}

      {/* ── Quick-Log Learning Dialog ── */}
      <Dialog open={!!logDialogSkill} onOpenChange={open => { if (!open) setLogDialogSkill(null); }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[18px]">
              <BookPlus className="h-5 w-5 text-primary" />
              Log learning entry
            </DialogTitle>
          </DialogHeader>

          {logDialogSkill && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 text-[12px] text-primary">
              Skill: <strong>{logDialogSkill}</strong>
            </div>
          )}

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Title *</label>
              <Input
                value={learningForm.title}
                onChange={e => setLearningForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. React Hooks deep dive, AWS Cloud Practitioner…"
                className="text-[13px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Category</label>
                <Select value={learningForm.category} onValueChange={v => setLearningForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Duration (hours)</label>
                <Input
                  type="number" min="0" step="0.5"
                  value={learningForm.durationHours}
                  onChange={e => setLearningForm(f => ({ ...f, durationHours: e.target.value }))}
                  placeholder="e.g. 2"
                  className="text-[13px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Status</label>
                <Select value={learningForm.status} onValueChange={v => setLearningForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Link to Goal (optional)</label>
                <Select value={learningForm.goalId} onValueChange={v => setLearningForm(f => ({ ...f, goalId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="text-[13px]"><SelectValue placeholder="No goal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No goal</SelectItem>
                    {goals.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Notes (optional)</label>
              <Textarea
                value={learningForm.notes}
                onChange={e => setLearningForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="What are you learning or working on for this skill?"
                className="text-[13px] resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setLogDialogSkill(null)} className="text-[13px]">Cancel</Button>
            <Button
              onClick={submitLearning}
              disabled={createProgress.isPending || !learningForm.title.trim()}
              className="gap-2 text-[13px]"
            >
              <BookOpen className="h-4 w-4" />
              {createProgress.isPending ? "Saving…" : "Save learning entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
