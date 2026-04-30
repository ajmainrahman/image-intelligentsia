import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { BrandLogo } from "@/components/brand-logo";
import {
  LayoutDashboard,
  Target,
  BookOpen,
  Map as MapIcon,
  Briefcase,
  BellRing,
  NotebookPen,
  Activity as ActivityIcon,
  LogOut,
  Sun,
  Moon,
  CalendarCheck,
  Microscope,
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
    items: [
      { href: "/research", label: "Research", icon: Microscope },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/jobs", label: "Opportunities", icon: Briefcase },
      { href: "/reminders", label: "Reminders", icon: BellRing },
      { href: "/notepad", label: "Notepad", icon: NotebookPen },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="fixed inset-y-0 left-0 w-56 flex flex-col border-r border-sidebar-border bg-sidebar z-30">

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-sidebar-border flex items-center gap-3">
        <BrandLogo className="h-9 w-9" iconClassName="h-5 w-5" />
        <div className="leading-tight">
          <div className="text-[18px] font-semibold text-sidebar-foreground tracking-tight">
            Atlas
          </div>
          <p className="text-[10.5px] text-sidebar-foreground/50 mt-0.5 leading-none">
            Career &amp; research
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-medium text-sidebar-foreground/30 uppercase tracking-widest px-3 mb-1.5">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  location === item.href ||
                  (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 relative group",
                      isActive
                        ? "text-sidebar-primary-foreground bg-sidebar-accent font-medium"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-primary rounded-r-full" />
                    )}
                    <item.icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="px-4 py-5 border-t border-sidebar-border space-y-3">

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-150 group"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60" />
          ) : (
            <Moon className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60" />
          )}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        {/* User info */}
        {user && (
          <div className="px-2">
            <p className="text-[13px] font-medium text-sidebar-foreground truncate">
              {user.name}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">
              {user.email}
            </p>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-150 group"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
