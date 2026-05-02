import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Check, ChevronRight, User, Target, BookOpen } from "lucide-react";

const serif = { fontFamily: "'DM Serif Display', serif", fontWeight: 400 };

type Step = 1 | 2 | 3;

const STEPS = [
  { id: 1, icon: User,     title: "Your Profile",    desc: "Tell us about yourself" },
  { id: 2, icon: Target,   title: "First Goal",      desc: "What are you working toward?" },
  { id: 3, icon: BookOpen, title: "First Learning",  desc: "What are you learning right now?" },
];

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);

  const [profile, setProfile] = useState({
    tagline: "", about: "", expertise: "", skills: "", interests: "",
  });
  const [goal, setGoal] = useState({
    title: "", targetRole: "", description: "", targetYear: String(new Date().getFullYear() + 1),
  });
  const [learning, setLearning] = useState({
    title: "", category: "course", description: "", durationHours: "1",
  });

  const saveProfile = useMutation({
    mutationFn: (data: object) => api("/profile", { method: "PUT", body: JSON.stringify(data) }),
  });
  const saveGoal = useMutation({
    mutationFn: (data: object) => api("/goals", { method: "POST", body: JSON.stringify(data) }),
  });
  const saveProgress = useMutation({
    mutationFn: (data: object) => api("/progress", { method: "POST", body: JSON.stringify(data) }),
  });

  const splitTags = (str: string) =>
    str.split(",").map((s) => s.trim()).filter(Boolean);

  const handleNext = async () => {
    if (step === 1) {
      if (!profile.tagline.trim()) {
        toast({ title: "Please add a tagline", variant: "destructive" }); return;
      }
      await saveProfile.mutateAsync({
        tagline: profile.tagline.trim(),
        about: profile.about.trim(),
        expertise: splitTags(profile.expertise),
        skills: splitTags(profile.skills),
        interests: splitTags(profile.interests),
      });
      setStep(2);
    } else if (step === 2) {
      if (!goal.title.trim() || !goal.targetRole.trim()) {
        toast({ title: "Please fill in goal title and target role", variant: "destructive" }); return;
      }
      await saveGoal.mutateAsync({
        title: goal.title.trim(),
        targetRole: goal.targetRole.trim(),
        description: goal.description.trim() || null,
        targetYear: Number(goal.targetYear) || null,
        skills: [], progress: 0, status: "active",
      });
      setStep(3);
    } else {
      if (!learning.title.trim()) {
        toast({ title: "Please add a title", variant: "destructive" }); return;
      }
      await saveProgress.mutateAsync({
        title: learning.title.trim(),
        category: learning.category,
        description: learning.description.trim() || null,
        durationHours: Number(learning.durationHours) || 0,
        status: "in_progress",
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      toast({ title: "You're all set! Welcome to Image Intelligentsia 🎉" });
      navigate("/");
    }
  };

  const skip = () => navigate("/");
  const isPending = saveProfile.isPending || saveGoal.isPending || saveProgress.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-[32px] text-foreground leading-tight mb-2" style={serif}>
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-[14px] text-muted-foreground">
            Let's set up your career dashboard in 3 quick steps.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    done    ? "bg-primary text-primary-foreground" :
                    active  ? "bg-primary/10 border-2 border-primary text-primary" :
                              "bg-secondary text-muted-foreground"
                  }`}>
                    {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-10 mb-4 transition-colors duration-300 ${step > s.id ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-card border border-border rounded-2xl p-8 shadow-sm"
          >
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-[20px] text-foreground mb-1" style={serif}>About you</h2>
                  <p className="text-[13px] text-muted-foreground">This shows on your dashboard overview.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Tagline *</label>
                  <Input
                    value={profile.tagline}
                    onChange={(e) => setProfile((p) => ({ ...p, tagline: e.target.value }))}
                    placeholder="e.g. ML Engineer passionate about Computer Vision"
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">About</label>
                  <Textarea
                    value={profile.about}
                    onChange={(e) => setProfile((p) => ({ ...p, about: e.target.value }))}
                    placeholder="A short summary about your background and goals…"
                    className="resize-none bg-secondary border-border text-[13px]"
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Expertise <span className="text-muted-foreground/60">(comma separated)</span></label>
                  <Input
                    value={profile.expertise}
                    onChange={(e) => setProfile((p) => ({ ...p, expertise: e.target.value }))}
                    placeholder="e.g. Computer Vision, NLP, Data Science"
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Skills <span className="text-muted-foreground/60">(comma separated)</span></label>
                  <Input
                    value={profile.skills}
                    onChange={(e) => setProfile((p) => ({ ...p, skills: e.target.value }))}
                    placeholder="e.g. Python, PyTorch, Docker, SQL"
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Interests <span className="text-muted-foreground/60">(comma separated)</span></label>
                  <Input
                    value={profile.interests}
                    onChange={(e) => setProfile((p) => ({ ...p, interests: e.target.value }))}
                    placeholder="e.g. Robotics, Open Source, Research"
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-[20px] text-foreground mb-1" style={serif}>Your first goal</h2>
                  <p className="text-[13px] text-muted-foreground">What career milestone are you working toward?</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Goal Title *</label>
                  <Input
                    value={goal.title}
                    onChange={(e) => setGoal((g) => ({ ...g, title: e.target.value }))}
                    placeholder="e.g. Transition to Machine Learning"
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Target Role *</label>
                  <Input
                    value={goal.targetRole}
                    onChange={(e) => setGoal((g) => ({ ...g, targetRole: e.target.value }))}
                    placeholder="e.g. ML Engineer at a top tech company"
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Target Year</label>
                  <Input
                    type="number"
                    value={goal.targetYear}
                    onChange={(e) => setGoal((g) => ({ ...g, targetYear: e.target.value }))}
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Why this goal?</label>
                  <Textarea
                    value={goal.description}
                    onChange={(e) => setGoal((g) => ({ ...g, description: e.target.value }))}
                    placeholder="What motivates you? What does success look like?"
                    className="resize-none bg-secondary border-border text-[13px]"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-[20px] text-foreground mb-1" style={serif}>What are you learning?</h2>
                  <p className="text-[13px] text-muted-foreground">Log your first learning entry to start tracking.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Title *</label>
                  <Input
                    value={learning.title}
                    onChange={(e) => setLearning((l) => ({ ...l, title: e.target.value }))}
                    placeholder="e.g. Deep Learning Specialization"
                    className="bg-secondary border-border text-[13px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground">Category</label>
                    <select
                      value={learning.category}
                      onChange={(e) => setLearning((l) => ({ ...l, category: e.target.value }))}
                      className="w-full h-9 rounded-lg border border-border bg-secondary px-3 text-[13px] text-foreground outline-none"
                    >
                      <option value="course">Course</option>
                      <option value="book">Book</option>
                      <option value="project">Project</option>
                      <option value="certification">Certification</option>
                      <option value="practice">Practice</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground">Hours so far</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={learning.durationHours}
                      onChange={(e) => setLearning((l) => ({ ...l, durationHours: e.target.value }))}
                      className="bg-secondary border-border text-[13px]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Notes</label>
                  <Textarea
                    value={learning.description}
                    onChange={(e) => setLearning((l) => ({ ...l, description: e.target.value }))}
                    placeholder="Key takeaways, what you're enjoying, next steps…"
                    className="resize-none bg-secondary border-border text-[13px]"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={skip}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip setup
          </button>
          <Button
            onClick={handleNext}
            disabled={isPending}
            className="gap-2 text-[13px] min-w-[120px]"
          >
            {isPending ? "Saving…" : step === 3 ? "Finish setup" : "Continue"}
            {!isPending && <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
