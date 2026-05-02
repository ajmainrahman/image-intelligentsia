import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { BrandLogo } from "@/components/brand-logo";
import {
  LayoutDashboard, Target, BookOpen, Map as MapIcon, Briefcase,
  BellRing, NotebookPen, Activity as ActivityIcon, CalendarCheck,
  Microscope, Sun, Moon, LogOut, ChevronDown, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PRIMARY_LINKS = [
  { href: "/",         label: "Overview",  icon: LayoutDashboard },
  { href: "/goals",    label: "Goals",     icon: Target },
  { href: "/progress", label: "Learning",  icon: BookOpen },
  { href: "/research", label: "Research",  icon: Microscope },
  { href: "/jobs",     label: "Jobs",      icon: Briefcase },
  { href: "/roadmap",  label: "Roadmap",   icon: MapIcon },
];

const MORE_LINKS = [
  { href: "/activity",      label: "Activity",      icon: ActivityIcon },
  { href: "/weekly-review", label: "Weekly Review", icon: CalendarCheck },
  { href: "/reminders",     label: "Reminders",     icon: BellRing },
  { href: "/notepad",       label: "Notepad",       icon: NotebookPen },
];

const ALL_LINKS = [...PRIMARY_LINKS, ...MORE_LINKS];

export function TopNav() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const moreActive = MORE_LINKS.some((l) => isActive(l.href));

  return (
    <>
      <header className="sticky top-0 z-40 h-14 bg-white/90 dark:bg-card/95 backdrop-blur-md border-b border-slate-200/70 dark:border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-4">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <BrandLogo className="h-8 w-8" iconClassName="h-4.5 w-4.5" />
            <span className="hidden sm:block text-[15px] font-bold text-slate-700 dark:text-slate-200 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Image Intelligentsia
            </span>
          </Link>

          {/* Desktop primary nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 mx-4">
            {PRIMARY_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors",
                    active
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
                  )}
                >
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                  {link.label}
                </Link>
              );
            })}

            {/* More dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors",
                    moreActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
                  )}
                >
                  More <ChevronDown className="h-3 w-3 mt-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {MORE_LINKS.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2.5 cursor-pointer",
                        isActive(link.href) && "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      <link.icon className="h-4 w-4 shrink-0" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                      {user.name?.charAt(0).toUpperCase() ?? "U"}
                    </div>
                    <span className="hidden sm:block text-[13px] font-medium text-slate-600 dark:text-slate-300 max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 top-14 bg-black/20 z-30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-white dark:bg-card border-b border-slate-200 dark:border-border shadow-lg px-3 py-3">
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-3 rounded-xl text-[13px] transition-colors",
                      active
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <link.icon className={cn("h-4 w-4 shrink-0", active ? "text-emerald-600" : "text-slate-400")} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
