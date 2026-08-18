import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { BrandLogo } from "@/components/brand-logo";
import {
  Activity as ActivityIcon,
  BellRing,
  BookOpen,
  Briefcase,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Microscope,
  Moon,
  NotebookPen,
  Sparkles,
  Sun,
  Target,
  UserRound,
} from "lucide-react";

const navSections = [
  {
    label: "Track",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/activity", label: "Activity", icon: ActivityIcon },
      { href: "/weekly-review", label: "Weekly Review", icon: CalendarCheck },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/progress", label: "Learning", icon: BookOpen },
      { href: "/roadmap", label: "Roadmap", icon: MapIcon },
    ],
  },
  {
    label: "Discover",
    items: [{ href: "/research", label: "Research", icon: Microscope }],
  },
  {
    label: "Manage",
    items: [
      { href: "/jobs", label: "Opportunities", icon: Briefcase },
      { href: "/reminders", label: "Reminders", icon: BellRing },
      { href: "/notepad", label: "Notepad", icon: NotebookPen },
      { href: "/skill-map", label: "Skill Map", icon: Sparkles },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] flex-col border-r border-sidebar-border bg-sidebar z-30">
      <div className="px-6 pt-7 pb-6 border-b border-sidebar-border flex items-center gap-3">
        <BrandLogo className="h-10 w-10 rounded-[14px]" iconClassName="h-5 w-5" />
        <div className="leading-tight">
          <div className="text-[18px] font-bold text-sidebar-foreground tracking-tight display-font">intelligentsia</div>
          <p className="text-[9px] text-sidebar-foreground/45 mt-1 leading-none eyebrow">learning command center</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-medium text-sidebar-foreground/35 uppercase tracking-[.18em] px-3 mb-2">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-testid={`link-sidebar-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] transition-all duration-200 relative group",
                      isActive
                        ? "text-sidebar-primary-foreground bg-sidebar-accent font-semibold shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/70",
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-5 py-5 border-t border-sidebar-border space-y-3">
        <button
          onClick={toggleTheme}
          data-testid="button-toggle-theme"
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-150 group"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-sidebar-foreground/35" /> : <Moon className="h-3.5 w-3.5 text-sidebar-foreground/35" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        {user && (
          <Link href="/profile" data-testid="link-profile" className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-sidebar-accent/60 transition-colors">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-[11px] font-bold shrink-0">
              {user.name?.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</p>
            </div>
            <UserRound className="h-3.5 w-3.5 ml-auto text-sidebar-foreground/35" />
          </Link>
        )}

        <button
          onClick={() => void logout()}
          data-testid="button-signout"
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-150 group"
        >
          <LogOut className="h-3.5 w-3.5 text-sidebar-foreground/35 group-hover:text-sidebar-foreground/60" />
          Sign out
        </button>
      </div>
    </aside>
  );
}