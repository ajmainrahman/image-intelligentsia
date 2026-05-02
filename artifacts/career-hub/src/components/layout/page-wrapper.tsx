import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
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
  CalendarCheck,
  Microscope,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { href: "/",         label: "Home",     icon: LayoutDashboard },
  { href: "/goals",    label: "Goals",    icon: Target },
  { href: "/research", label: "Research", icon: Microscope },
  { href: "/progress", label: "Learning", icon: BookOpen },
  { href: "/jobs",     label: "Jobs",     icon: Briefcase },
];

const FULL_NAV = [
  { href: "/",              label: "Overview",      icon: LayoutDashboard },
  { href: "/activity",      label: "Activity",      icon: ActivityIcon },
  { href: "/weekly-review", label: "Weekly Review", icon: CalendarCheck },
  { href: "/goals",         label: "Goals",         icon: Target },
  { href: "/progress",      label: "Learning",      icon: BookOpen },
  { href: "/roadmap",       label: "Roadmap",       icon: MapIcon },
  { href: "/research",      label: "Research",      icon: Microscope },
  { href: "/jobs",          label: "Opportunities", icon: Briefcase },
  { href: "/reminders",     label: "Reminders",     icon: BellRing },
  { href: "/notepad",       label: "Notepad",       icon: NotebookPen },
];

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-background">

      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 h-14 bg-sidebar border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2.5 px-1 py-1 -ml-1 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
          <BrandLogo className="h-8 w-8" iconClassName="h-4.5 w-4.5" />
          <span className="text-[16px] font-semibold text-sidebar-foreground tracking-tight">
            Image Intelligentsia
          </span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="p-2.5 -mr-1 rounded-lg text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-14 bg-black/30 z-20"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed top-14 left-0 right-0 z-30 bg-sidebar border-b border-sidebar-border px-3 py-3 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
            <div className="grid grid-cols-2 gap-1.5">
              {FULL_NAV.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-3 rounded-xl text-[14px] transition-colors min-h-[48px]",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* User strip + theme + logout */}
            <div className="mt-4 pt-3 border-t border-sidebar-border">
              {user && (
                <div className="px-3 pb-2">
                  <p className="text-[13px] font-medium text-sidebar-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-sidebar-foreground/50 truncate">{user.email}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={toggleTheme}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-sidebar-foreground/80 bg-sidebar-accent/60 hover:bg-sidebar-accent transition-colors min-h-[44px]"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-sidebar-foreground/80 bg-sidebar-accent/60 hover:bg-sidebar-accent transition-colors min-h-[44px]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="md:pl-56 flex flex-col min-h-screen overflow-y-auto">
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 md:px-10 pt-20 md:pt-10 pb-28 md:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <div className="flex items-stretch justify-around px-1 h-[64px]">
          {PRIMARY_NAV.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 px-1 active:bg-sidebar-accent/40 transition-colors"
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-sidebar-primary rounded-b-full" />
                )}
                <item.icon className={cn(
                  "h-[22px] w-[22px] transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/45"
                )} />
                <span className={cn(
                  "text-[10.5px] font-medium transition-colors leading-none",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/45"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
