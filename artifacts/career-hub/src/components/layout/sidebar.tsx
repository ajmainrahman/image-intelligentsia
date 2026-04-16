import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { BrandLogo } from "@/components/brand-logo";
import {
  LayoutDashboard,
  Target,
  BookOpen,
  Map as MapIcon,
  Briefcase,
  BellRing,
  LogOut,
} from "lucide-react";

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
      <div className="flex flex-col px-5 pt-6 pb-5 border-b border-sidebar-border gap-1">
        <div className="flex items-center gap-3 mb-1">
          <BrandLogo className="h-9 w-9 shrink-0 rounded-xl" iconClassName="h-5 w-5" />
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground leading-none">
            Image Intelligentsia
          </span>
        </div>
        {user && (
          <p className="text-[11px] text-sidebar-foreground/50 leading-snug pl-0.5 truncate">
            {user.name}
          </p>
        )}
      </div>

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

      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-destructive transition-all duration-150 group"
        >
          <LogOut className="h-4 w-4 shrink-0 text-sidebar-foreground/40 group-hover:text-destructive" />
          Sign out
        </button>
        <p className="text-[10px] text-sidebar-foreground/25 leading-relaxed px-1 mt-3">
          © 2025 Image Intelligentsia
        </p>
      </div>
    </aside>
  );
}
