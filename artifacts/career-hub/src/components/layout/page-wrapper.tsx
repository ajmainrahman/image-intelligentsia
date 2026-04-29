import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/theme-context";
import {
  LayoutDashboard,
  Target,
  BookOpen,
  Map as MapIcon,
  Briefcase,
  BellRing,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { href: "/",         label: "Overview",  icon: LayoutDashboard },
  { href: "/goals",    label: "Goals",     icon: Target },
  { href: "/progress", label: "Learning",  icon: BookOpen },
  { href: "/roadmap",  label: "Roadmap",   icon: MapIcon },
  { href: "/jobs",     label: "Jobs",      icon: Briefcase },
  { href: "/reminders",label: "Reminders", icon: BellRing },
];

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { theme } = useTheme();

  return (
    <div className="min-h-[100dvh] bg-background">

      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border">
        <span
          className="text-[17px] text-sidebar-foreground leading-none tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Intelligentsia
        </span>
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="p-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-30 bg-sidebar border-b border-sidebar-border px-3 py-4 space-y-1">
          {MOBILE_NAV.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/40")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <main className="md:pl-56 flex flex-col min-h-screen overflow-y-auto">
        <div className="flex-1 w-full max-w-[860px] mx-auto px-4 md:px-10 pt-20 md:pt-10 pb-24 md:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border">
        <div className="flex items-center justify-around px-2 h-16">
          {MOBILE_NAV.slice(0, 5).map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors"
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/40"
                )} />
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground/40"
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
