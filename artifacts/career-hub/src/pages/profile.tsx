import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, CheckCircle2, UserRound, X, Briefcase, Tag, Lightbulb } from "lucide-react";

type Profile = {
  tagline: string; about: string;
  expertise: string[]; skills: string[]; interests: string[];
  updatedAt?: string;
};
const emptyProfile = (): Profile => ({ tagline: "", about: "", expertise: [], skills: [], interests: [] });

function TagInput({ label, hint, values, placeholder, onAdd, onRemove, pillClass }: {
  label: string; hint?: string; values: string[]; placeholder: string;
  onAdd: (v: string) => void; onRemove: (v: string) => void; pillClass: string;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim().replace(/,$/, "");
    if (!v || values.includes(v)) { setDraft(""); return; }
    onAdd(v); setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-secondary p-2.5 min-h-[46px] cursor-text"
        onClick={() => (document.getElementById(`input-${label}`) as HTMLInputElement)?.focus()}>
        {values.map(v => (
          <span key={v} className={`flex items-center gap-1 text-[12px] px-2.5 py-0.5 rounded-full font-medium ${pillClass}`}>
            {v}
            <button type="button" onClick={e => { e.stopPropagation(); onRemove(v); }} className="hover:opacity-60 transition-opacity">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          id={`input-${label}`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } else if (e.key === "Backspace" && !draft && values.length) onRemove(values[values.length - 1]); }}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : "Add more…"}
          className="flex-1 min-w-[160px] bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">Press Enter or comma to add each item</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<Profile>(emptyProfile());
  const [justSaved, setJustSaved] = useState(false);

  const { data: profileData, isLoading } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: () => api<Profile>("/profile"),
    enabled: !!user,
  });

  useEffect(() => { if (profileData) setForm(profileData); }, [profileData]);

  const saveMutation = useMutation({
    mutationFn: (data: Profile) => api("/profile", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setJustSaved(true); setTimeout(() => setJustSaved(false), 2500);
      toast({ title: "Profile saved!" });
    },
    onError: () => toast({ title: "Could not save profile", variant: "destructive" }),
  });

  const add = (field: keyof Pick<Profile, "skills" | "expertise" | "interests">) => (v: string) =>
    setForm(f => ({ ...f, [field]: [...f[field], v] }));
  const remove = (field: keyof Pick<Profile, "skills" | "expertise" | "interests">) => (v: string) =>
    setForm(f => ({ ...f, [field]: f[field].filter(x => x !== v) }));

  const initials = user?.name ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?";
  const completeness = [
    form.tagline.length > 0,
    form.about.length > 0,
    form.skills.length > 0,
    form.expertise.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter pb-10">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/">
            <button className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-3 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to Dashboard
            </button>
          </Link>
          <h1 className="text-[28px] font-bold text-foreground leading-tight">My Profile</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Your career identity — skills, expertise, and what makes you you.</p>
        </div>
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="gap-2 text-[13px] shrink-0 mt-8"
        >
          {justSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saveMutation.isPending ? "Saving…" : justSaved ? "Saved!" : "Save profile"}
        </Button>
      </div>

      {/* Completeness bar */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-foreground">Profile completeness</span>
          <span className="text-[13px] font-bold text-primary">{completeness * 25}%</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completeness * 25}%` }} />
        </div>
        {completeness < 4 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Missing: {[!form.tagline && "tagline", !form.about && "about", !form.skills.length && "skills", !form.expertise.length && "expertise"].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Identity */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <UserRound className="h-4 w-4 text-primary" />
          <h2 className="text-[16px] font-semibold text-foreground">Identity</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[18px] flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-[16px] font-bold text-foreground">{user?.name ?? "—"}</p>
            <p className="text-[13px] text-muted-foreground">{user?.email ?? ""}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Tagline <span className="text-muted-foreground font-normal">(shown on dashboard)</span></label>
          <Input
            value={form.tagline}
            onChange={e => setForm(f => ({ ...f, tagline: e.target.value.slice(0, 200) }))}
            placeholder="e.g. ML Engineer building AI products · Open to remote roles"
            className="text-[13px]"
          />
          <p className="text-[11px] text-muted-foreground">{form.tagline.length}/200</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">About</label>
          <Textarea
            value={form.about}
            onChange={e => setForm(f => ({ ...f, about: e.target.value.slice(0, 2000) }))}
            placeholder="Your background, what you're working toward, what drives you…"
            className="resize-y text-[13px] min-h-[100px]"
            rows={4}
          />
          <p className="text-[11px] text-muted-foreground">{form.about.length}/2000</p>
        </div>
      </div>

      {/* Skills & Expertise */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Briefcase className="h-4 w-4 text-primary" />
          <h2 className="text-[16px] font-semibold text-foreground">Skills & Expertise</h2>
        </div>
        <TagInput
          label="Technical Skills"
          hint={`${form.skills.length} added`}
          values={form.skills}
          placeholder="Python, React, SQL, Docker, TypeScript…"
          onAdd={add("skills")}
          onRemove={remove("skills")}
          pillClass="bg-accent text-primary border border-primary/20"
        />
        <TagInput
          label="Expertise Areas"
          hint={`${form.expertise.length} added`}
          values={form.expertise}
          placeholder="Machine Learning, Backend Dev, Data Analysis…"
          onAdd={add("expertise")}
          onRemove={remove("expertise")}
          pillClass="bg-amber-50 text-amber-700 border border-amber-200"
        />
      </div>

      {/* Interests */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h2 className="text-[16px] font-semibold text-foreground">Interests</h2>
        </div>
        <TagInput
          label="What are you curious about?"
          hint={`${form.interests.length} added`}
          values={form.interests}
          placeholder="AI Research, Open Source, Education, Climate Tech…"
          onAdd={add("interests")}
          onRemove={remove("interests")}
          pillClass="bg-secondary text-foreground border border-border"
        />
      </div>

      {/* Bottom save */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          size="lg"
          className="gap-2"
        >
          {justSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saveMutation.isPending ? "Saving…" : justSaved ? "Saved!" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
