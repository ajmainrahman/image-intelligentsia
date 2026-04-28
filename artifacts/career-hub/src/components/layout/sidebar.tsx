import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
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
} from "lucide-react";

const navSections = [
  {
    label: "Track",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/activity", label: "Activity", icon: ActivityIcon },
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

  return (
    <aside className="fixed inset-y-0 left-0 w-56 flex flex-col border-r border-border bg-card">

      {/* Brand */}
      <div className="px-6 pt-7 pb-6 border-b border-border">
        <span
          className="text-[19px] text-foreground leading-none tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Intelligentsia
        </span>
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-none">
          Career dashboard
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest px-3 mb-1.5">
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
                        ? "text-primary bg-accent font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                    )}
                    <item.icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground/50 group-hover:text-muted-foreground"
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

      {/* User + Sign out */}
      <div className="px-4 py-5 border-t border-border space-y-3">
        {user && (
          <div className="px-2">
            <p className="text-[13px] font-medium text-foreground truncate">
              {user.name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150 group"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
