import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Search, Target, BookOpen, Map as MapIcon, Briefcase,
  Microscope, ArrowRight, X, LayoutDashboard,
} from "lucide-react";

type Goal = { id: number; title: string; targetRole: string };
type RoadmapItem = { id: number; title: string; phase: string; yearTarget: number };
type ProgressEntry = { id: number; title: string; category: string; status: string };
type Job = { id: number; title: string; company: string | null; status: string };
type ResearchItem = { id: number; title: string; type: string; summary: string | null; tags: string[] };

type Module = "goals" | "roadmap" | "learning" | "jobs" | "research";

type SearchResult = {
  id: number;
  module: Module;
  label: string;
  sublabel?: string;
  href: string;
};

const MODULE_META: Record<Module, { label: string; icon: React.ElementType; iconColor: string; iconBg: string; href: string }> = {
  goals:    { label: "Goals",    icon: Target,    iconColor: "text-amber-600",   iconBg: "bg-amber-50",    href: "/goals"    },
  roadmap:  { label: "Roadmap",  icon: MapIcon,   iconColor: "text-rose-600",    iconBg: "bg-rose-50",     href: "/roadmap"  },
  learning: { label: "Learning", icon: BookOpen,  iconColor: "text-sky-600",     iconBg: "bg-sky-50",      href: "/progress" },
  jobs:     { label: "Pipeline", icon: Briefcase, iconColor: "text-emerald-600", iconBg: "bg-emerald-50",  href: "/jobs"     },
  research: { label: "Research", icon: Microscope,iconColor: "text-purple-600",  iconBg: "bg-purple-50",   href: "/research" },
};

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800/60 text-foreground rounded-sm not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function useGlobalSearch() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  return { open, setOpen };
}

export function GlobalSearch() {
  const { open, setOpen } = useGlobalSearch();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/goals") });
  const { data: roadmap = [] } = useQuery<RoadmapItem[]>({ queryKey: ["roadmap"], queryFn: () => api<RoadmapItem[]>("/roadmap") });
  const { data: progress = [] } = useQuery<ProgressEntry[]>({ queryKey: ["progress"], queryFn: () => api<ProgressEntry[]>("/progress") });
  const { data: jobs = [] } = useQuery<Job[]>({ queryKey: ["jobs"], queryFn: () => api<Job[]>("/jobs") });
  const { data: research = [] } = useQuery<ResearchItem[]>({ queryKey: ["research"], queryFn: () => api<ResearchItem[]>("/research") });

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 80); }
    else { setQuery(""); setCursor(0); }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const out: SearchResult[] = [];
    goals.filter(g => g.title.toLowerCase().includes(q) || g.targetRole.toLowerCase().includes(q)).slice(0, 3)
      .forEach(g => out.push({ id: g.id, module: "goals", label: g.title, sublabel: g.targetRole, href: `/goals/${g.id}` }));
    roadmap.filter(r => r.title.toLowerCase().includes(q)).slice(0, 3)
      .forEach(r => out.push({ id: r.id, module: "roadmap", label: r.title, sublabel: `${r.phase.replace("_", " ")} · ${r.yearTarget}`, href: "/roadmap" }));
    progress.filter(p => p.title.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q)).slice(0, 3)
      .forEach(p => out.push({ id: p.id, module: "learning", label: p.title, sublabel: `${p.category} · ${p.status.replace("_", " ")}`, href: "/progress" }));
    jobs.filter(j => j.title.toLowerCase().includes(q) || (j.company ?? "").toLowerCase().includes(q)).slice(0, 3)
      .forEach(j => out.push({ id: j.id, module: "jobs", label: j.title, sublabel: j.company ?? j.status, href: "/jobs" }));
    research.filter(r => r.title.toLowerCase().includes(q) || (r.summary ?? "").toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q))).slice(0, 3)
      .forEach(r => out.push({ id: r.id, module: "research", label: r.title, sublabel: r.type, href: "/research" }));
    return out;
  }, [query, goals, roadmap, progress, jobs, research]);

  const handleNavigate = useCallback((href: string) => {
    setLocation(href);
    setOpen(false);
  }, [setLocation, setOpen]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === "Enter" && results[cursor]) { handleNavigate(results[cursor].href); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-[560px] gap-0 rounded-2xl overflow-hidden border border-border shadow-2xl" aria-describedby={undefined}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search goals, milestones, learning, jobs, research…"
            className="flex-1 bg-transparent outline-none text-[14px] text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-2 shrink-0">
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-secondary text-muted-foreground font-mono hidden sm:inline">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {query.trim().length >= 2 ? (
            results.length > 0 ? (
              <div className="py-1.5">
                {(["goals", "roadmap", "learning", "jobs", "research"] as Module[]).map(module => {
                  const moduleResults = results.filter(r => r.module === module);
                  if (!moduleResults.length) return null;
                  const meta = MODULE_META[module];
                  const Icon = meta.icon;
                  return (
                    <div key={module}>
                      <div className="flex items-center gap-2 px-4 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{meta.label} ({moduleResults.length})</span>
                      </div>
                      {moduleResults.map((result, i) => {
                        const globalIdx = results.indexOf(result);
                        const isFocused = globalIdx === cursor;
                        return (
                          <button
                            key={`${result.module}-${result.id}`}
                            onClick={() => handleNavigate(result.href)}
                            onMouseEnter={() => setCursor(globalIdx)}
                            className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 transition-colors text-left group ${isFocused ? "bg-secondary" : "hover:bg-secondary/60"}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                                <Icon className={`h-3.5 w-3.5 ${meta.iconColor}`} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-foreground line-clamp-1">
                                  <Highlight text={result.label} query={query} />
                                </p>
                                {result.sublabel && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-1 capitalize">{result.sublabel}</p>
                                )}
                              </div>
                            </div>
                            <ArrowRight className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-opacity ${isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-60"}`} />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-14 text-center">
                <Search className="h-7 w-7 mx-auto text-muted-foreground/25 mb-3" />
                <p className="text-[14px] font-medium text-foreground mb-1">No results found</p>
                <p className="text-[12px] text-muted-foreground">Try a different search term</p>
              </div>
            )
          ) : (
            <div className="py-6 px-4">
              <p className="text-[12px] font-medium text-muted-foreground mb-3 text-center">Jump to a section</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: "Dashboard", icon: LayoutDashboard, href: "/", color: "text-slate-600", bg: "bg-slate-100" },
                  ...Object.entries(MODULE_META).map(([, m]) => ({ label: m.label, icon: m.icon, href: m.href, color: m.iconColor, bg: m.iconBg })),
                ].map(({ label, icon: Icon, href, color, bg }) => (
                  <button key={href} onClick={() => handleNavigate(href)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border hover:bg-secondary transition-colors text-left">
                    <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                    </span>
                    <span className="text-[13px] font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 bg-secondary/50">
          <span className="text-[11px] text-muted-foreground"><kbd className="font-mono bg-background border border-border rounded px-1">↑↓</kbd> navigate</span>
          <span className="text-[11px] text-muted-foreground"><kbd className="font-mono bg-background border border-border rounded px-1">↵</kbd> open</span>
          <span className="text-[11px] text-muted-foreground ml-auto"><kbd className="font-mono bg-background border border-border rounded px-1">⌘K</kbd> toggle</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open search (Ctrl+K)"
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors text-[13px]"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Search…</span>
      <kbd className="ml-2 text-[10px] font-mono bg-background border border-border rounded px-1 py-0.5">⌘K</kbd>
    </button>
  );
}
