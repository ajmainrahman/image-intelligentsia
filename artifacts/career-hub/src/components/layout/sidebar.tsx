import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Target,
  BookOpen,
  Map as MapIcon,
  Briefcase,
  BellRing,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/progress", label: "Learning", icon: BookOpen },
  { href: "/roadmap", label: "Roadmap", icon: MapIcon },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/reminders", label: "Reminders", icon: BellRing },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex flex-col px-5 pt-6 pb-5 border-b border-sidebar-border gap-1">
        <div className="flex items-center gap-3 mb-1">
          <img
            src="/logo.svg"
            alt="imageintelligentsia logo"
            className="h-9 w-9 shrink-0 rounded-xl"
          />
          <span
            className="text-[15px] font-semibold tracking-tight text-sidebar-foreground leading-none"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            imageintelligentsia
          </span>
        </div>
        <p className="text-[10.5px] text-sidebar-foreground/40 italic leading-snug pl-0.5">
          The model is still training.
          <br />
          Watch this space.
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary shadow-sm"
                  : "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground/90"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors duration-150",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                )}
              />
              {item.label}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
        {user && (
          <div className="flex items-center gap-2 px-1">
            <div className="h-6 w-6 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-sidebar-primary uppercase">
                {user.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors duration-150"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Sign out
        </button>
        <p className="text-[10px] text-sidebar-foreground/25 leading-relaxed px-1">
          © 2025 imageintelligentsia
        </p>
      </div>
    </aside>
  );
}
