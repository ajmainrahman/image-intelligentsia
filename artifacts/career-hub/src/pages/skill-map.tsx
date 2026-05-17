import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Target, BookOpen, CheckCircle2, Circle, ChevronRight, Sparkles,
  TrendingUp, AlertCircle, Link as LinkIcon, RotateCcw,
} from "lucide-react";

type Goal = { id: number; title: string; targetRole: string; skills: string[]; progress: number };
type ProgressEntry = { id: number; title: string; category: string; status: string; goalId: number | null };

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

const STORAGE_KEY = "skill-map-v1";

type SavedState = { role: string; checkedSkills: string[] };

function loadSaved(): SavedState | null {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"); } catch { return null; }
}
function save(state: SavedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function SkillMapPage() {
  const saved = useMemo(() => loadSaved(), []);
  const [selectedRole, setSelectedRole] = useState<string>(saved?.role ?? "");
  const [checkedSkills, setCheckedSkills] = useState<Set<string>>(new Set(saved?.checkedSkills ?? []));

  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });
  const { data: progressEntries = [] } = useQuery<ProgressEntry[]>({ queryKey: ["progress"], queryFn: () => api<ProgressEntry[]>("/progress") });

  useEffect(() => {
    if (selectedRole) save({ role: selectedRole, checkedSkills: [...checkedSkills] });
  }, [selectedRole, checkedSkills]);

  const roleSkills = useMemo(() => ROLE_SKILLS[selectedRole] ?? [], [selectedRole]);
  const coreSkills = roleSkills.filter(s => s.priority === "core");
  const bonusSkills = roleSkills.filter(s => s.priority === "bonus");

  const toggle = (skill: string) => {
    setCheckedSkills(prev => { const next = new Set(prev); next.has(skill) ? next.delete(skill) : next.add(skill); return next; });
  };

  const totalSkills = roleSkills.length;
  const coreTotal = coreSkills.length;
  const coreDone = coreSkills.filter(s => checkedSkills.has(s.skill)).length;
  const bonusDone = bonusSkills.filter(s => checkedSkills.has(s.skill)).length;
  const totalDone = coreDone + bonusDone;

  // Job-ready score: core skills count 2x, bonus 1x
  const maxScore = coreTotal * 2 + bonusSkills.length;
  const score = coreDone * 2 + bonusDone;
  const jobReadyPct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const gapSkills = roleSkills.filter(s => !checkedSkills.has(s.skill));
  const coreGaps = gapSkills.filter(s => s.priority === "core");

  // Cross-reference with goals: find goals that mention any gap skills
  const goalSuggestions = useMemo(() => {
    if (!gapSkills.length) return [];
    const gapSet = new Set(gapSkills.map(s => s.skill.toLowerCase()));
    return goals
      .filter(g => g.skills.some(sk => gapSet.has(sk.toLowerCase())))
      .map(g => ({
        goal: g,
        matchedSkills: g.skills.filter(sk => gapSet.has(sk.toLowerCase())),
      }))
      .slice(0, 3);
  }, [goals, gapSkills]);

  // Cross-reference with learning: learning entries matching gap skills
  const learningMatches = useMemo(() => {
    if (!gapSkills.length) return [];
    const gapSet = new Set(gapSkills.map(s => s.skill.toLowerCase()));
    return progressEntries
      .filter(e => gapSet.has(e.title.toLowerCase()) || gapSet.has(e.category.toLowerCase()) ||
        gapSkills.some(g => e.title.toLowerCase().includes(g.skill.toLowerCase())))
      .slice(0, 4);
  }, [progressEntries, gapSkills]);

  // Study plan: top 3 core gap skills to focus on
  const studyPlan = coreGaps.slice(0, 3);

  const scoreColor = jobReadyPct >= 80 ? "text-emerald-600" : jobReadyPct >= 50 ? "text-amber-600" : "text-rose-600";
  const scoreBg = jobReadyPct >= 80 ? "bg-emerald-500" : jobReadyPct >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold text-foreground leading-tight">Skill Map</h1>
          <p className="text-[14px] text-muted-foreground mt-1.5">Select a target role to see the required skills and measure your readiness.</p>
        </div>
        {selectedRole && (
          <Button variant="outline" size="sm" onClick={() => { setSelectedRole(""); setCheckedSkills(new Set()); localStorage.removeItem(STORAGE_KEY); }} className="gap-2 text-[12px]">
            <RotateCcw className="h-3.5 w-3.5" />Reset
          </Button>
        )}
      </div>

      {/* Role selector */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <label className="text-[13px] font-medium text-muted-foreground block mb-2">Target Role</label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
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

      {selectedRole && roleSkills.length > 0 && (
        <>
          {/* Job-ready score banner */}
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
              <span className="text-muted-foreground"><strong className="text-foreground">{coreDone}/{coreTotal}</strong> core skills</span>
              <span className="text-muted-foreground"><strong className="text-foreground">{bonusDone}/{bonusSkills.length}</strong> bonus skills</span>
              <span className="text-muted-foreground"><strong className="text-foreground">{coreGaps.length}</strong> critical gaps</span>
              {jobReadyPct >= 80 && <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Ready to apply!</span>}
              {jobReadyPct < 50 && <span className="text-amber-600 font-medium flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />Focus on core skills first</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Skills checklist (2/3 width) */}
            <div className="lg:col-span-2 space-y-5">
              {/* Core skills */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-foreground">Core Skills <span className="text-[12px] text-muted-foreground font-normal">(required)</span></h3>
                  <span className="text-[12px] text-muted-foreground">{coreDone}/{coreTotal} checked</span>
                </div>
                <div className="space-y-2">
                  {coreSkills.map(({ skill }) => {
                    const has = checkedSkills.has(skill);
                    const isLearning = learningMatches.some(e => e.title.toLowerCase().includes(skill.toLowerCase()));
                    return (
                      <button key={skill} onClick={() => toggle(skill)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${has ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" : "bg-background border-border hover:border-primary/30 hover:bg-secondary/50"}`}>
                        <span className={`shrink-0 ${has ? "text-emerald-600" : "text-muted-foreground/40"}`}>
                          {has ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </span>
                        <span className={`flex-1 text-[13px] font-medium ${has ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>{skill}</span>
                        {isLearning && !has && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 shrink-0">in learning</span>
                        )}
                        {!has && <span className="text-[10px] text-rose-500 font-medium shrink-0">gap</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bonus skills */}
              {bonusSkills.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-semibold text-foreground">Bonus Skills <span className="text-[12px] text-muted-foreground font-normal">(nice to have)</span></h3>
                    <span className="text-[12px] text-muted-foreground">{bonusDone}/{bonusSkills.length} checked</span>
                  </div>
                  <div className="space-y-2">
                    {bonusSkills.map(({ skill }) => {
                      const has = checkedSkills.has(skill);
                      return (
                        <button key={skill} onClick={() => toggle(skill)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${has ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" : "bg-background border-border hover:border-primary/30 hover:bg-secondary/50"}`}>
                          <span className={`shrink-0 ${has ? "text-emerald-600" : "text-muted-foreground/40"}`}>
                            {has ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </span>
                          <span className={`flex-1 text-[13px] font-medium ${has ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>{skill}</span>
                          {!has && <span className="text-[10px] text-amber-500 font-medium shrink-0">bonus</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar: study plan + suggestions */}
            <div className="space-y-4">
              {/* Study plan */}
              {studyPlan.length > 0 ? (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h3 className="text-[14px] font-semibold text-foreground">Study Plan</h3>
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-3">Focus on these core gaps first:</p>
                  <div className="space-y-2">
                    {studyPlan.map((s, i) => (
                      <div key={s.skill} className="flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/40 px-3 py-2.5">
                        <span className="text-[11px] font-bold text-rose-400 mt-0.5 shrink-0">#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-rose-700 dark:text-rose-400 line-clamp-1">{s.skill}</p>
                          <p className="text-[11px] text-rose-500 mt-0.5">30 min/day focused practice</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/progress">
                    <Button variant="outline" size="sm" className="w-full mt-3 text-[12px] gap-2">
                      <BookOpen className="h-3.5 w-3.5" />Log learning entry
                    </Button>
                  </Link>
                </div>
              ) : totalDone === totalSkills ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-2xl p-5 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-[14px] font-semibold text-emerald-700">All skills checked!</p>
                  <p className="text-[12px] text-emerald-600 mt-1">You're fully prepared for this role.</p>
                </div>
              ) : null}

              {/* Linked goals that cover gap skills */}
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
                          <p className="text-[12px] font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{goal.title}</p>
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

              {/* Learning entries covering gap skills */}
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
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${entry.status === "completed" ? "bg-emerald-100 text-emerald-700" : entry.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                            {entry.status.replace("_", " ")}
                          </span>
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
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-[12px] text-muted-foreground mb-2">Add skills to your career goals:</p>
                <Link href="/goals">
                  <Button variant="outline" size="sm" className="w-full text-[12px] gap-2">
                    <LinkIcon className="h-3.5 w-3.5" />Open Goals
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
          <p className="text-[13px] text-muted-foreground max-w-xs">Choose a target role above to see the required skills and measure how ready you are.</p>
        </div>
      )}
    </div>
  );
}
