import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Eye, EyeOff, Loader2, ArrowUpRight, Check } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

type View = "login" | "register";

function PasswordInput({
  value,
  onChange,
  placeholder = "Enter your password",
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-12 w-full rounded-xl border border-border bg-background px-4 pr-11 text-[13px] text-foreground placeholder:text-muted-foreground/65 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        data-testid="input-password"
      />
      <button
        type="button"
        onClick={() => setShow((current) => !current)}
        aria-label={show ? "Hide password" : "Show password"}
        data-testid="button-toggle-password"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function SignInPage() {
  const { login, register } = useAuth();
  const [view, setView] = useState<View>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchView = (next: View) => {
    setError("");
    setPassword("");
    setView(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (view === "register" && password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }
    setLoading(true);
    try {
      if (view === "login") await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : view === "login" ? "We could not sign you in." : "We could not create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-6 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100dvh-3rem)] max-w-[1180px] overflow-hidden rounded-[30px] border border-border bg-card shadow-[0_24px_80px_hsl(154_16%_20%/.11)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sidebar-primary/15 blur-3xl" aria-hidden="true" />
          <div className="absolute bottom-10 right-10 h-32 w-32 rounded-full border border-sidebar-primary/20" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-11 w-11 rounded-[15px]" iconClassName="h-6 w-6" />
              <div>
                <p className="display-font text-[21px] font-semibold">intelligentsia</p>
                <p className="eyebrow text-[9px] text-sidebar-foreground/45 mt-1">career command center</p>
              </div>
            </div>
            <div className="mt-28 max-w-[400px]">
              <p className="eyebrow text-[10px] text-sidebar-primary">Make the next move visible</p>
              <h1 className="display-font mt-4 text-[54px] font-semibold leading-[.98] tracking-[-.03em]">
                A little more clarity. A lot more momentum.
              </h1>
              <p className="mt-6 max-w-[360px] text-[14px] leading-6 text-sidebar-foreground/65">
                One calm place to turn research, practice, goals, and opportunities into a career you can see taking shape.
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-3 text-[11px] text-sidebar-foreground/55">
            <span className="h-2 w-2 rounded-full bg-sidebar-primary" />
            Your private workspace for deliberate progress
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-[390px]">
            <div className="mb-8 lg:hidden flex items-center gap-3">
              <BrandLogo className="h-10 w-10 rounded-[13px]" iconClassName="h-5 w-5" />
              <div>
                <p className="display-font text-[19px] font-semibold">intelligentsia</p>
                <p className="eyebrow text-[8px] text-muted-foreground mt-1">career command center</p>
              </div>
            </div>
            <div className="mb-8">
              <p className="eyebrow text-[9px] text-primary">Welcome back</p>
              <h2 className="display-font mt-3 text-[35px] leading-none font-semibold text-foreground">
                {view === "login" ? "Pick up where you left off." : "Start with one good question."}
              </h2>
              <p className="mt-3 text-[13px] leading-5 text-muted-foreground">
                {view === "login" ? "Your goals, notes, and next steps are waiting." : "Build a private workspace for the work you want to do next."}
              </p>
            </div>

            <div className="mb-7 grid grid-cols-2 rounded-xl bg-muted p-1">
              {(["login", "register"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => switchView(option)}
                  data-testid={`button-switch-${option}`}
                  className={`rounded-lg py-2.5 text-[12px] font-semibold transition-all ${view === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {option === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-[12px] leading-5 text-destructive" role="alert" data-testid="status-signin-error">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {view === "register" && (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold text-foreground">Full name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="How should we call you?"
                    required
                    autoFocus
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-[13px] outline-none transition placeholder:text-muted-foreground/65 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    data-testid="input-name"
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold text-foreground">Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus={view === "login"}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-[13px] outline-none transition placeholder:text-muted-foreground/65 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  data-testid="input-email"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold text-foreground">
                  Password {view === "register" && <span className="font-normal text-muted-foreground">(6+ characters)</span>}
                </span>
                <PasswordInput value={password} onChange={setPassword} required />
              </label>
              <button
                type="submit"
                disabled={loading}
                data-testid="button-submit-auth"
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-bold text-primary-foreground shadow-[0_8px_18px_hsl(var(--primary)/.22)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_hsl(var(--primary)/.28)] disabled:translate-y-0 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                {loading ? (view === "login" ? "Signing you in…" : "Creating your workspace…") : (view === "login" ? "Continue to workspace" : "Create my workspace")}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-secondary-foreground" />
              Your progress stays private to your account
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}