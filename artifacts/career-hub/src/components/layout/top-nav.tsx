import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import {
  Bell, ChevronDown, Menu, Moon, Search, Sun, X,
  LayoutDashboard, Target, BookOpen, Map as MapIcon, Briefcase,
  BellRing, NotebookPen, CalendarCheck, Microscope, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MOBILE_LINKS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/progress", label: "Learning", icon: BookOpen },
  { href: "/roadmap", label: "Roadmap", icon: MapIcon },
  { href: "/research", label: "Research", icon: Microscope },
  { href: "/jobs", label: "Opportunities", icon: Briefcase },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/notepad", label: "Notepad", icon: NotebookPen },
  { href: "/weekly-review", label: "Weekly review", icon: CalendarCheck },
  { href: "/skill-map", label: "Skill map", icon: Sparkles },
];

function openSearch() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
}

export function TopNav() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 h-[72px] border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="lg:hidden h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="hidden sm:block">
              <p className="eyebrow text-[9px] text-muted-foreground">your workspace</p>
              <p className="text-[13px] font-semibold text-foreground mt-1">Career command center</p>
            </div>
            <div className="sm:hidden">
              <p className="display-font text-[18px] font-semibold">intelligentsia</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openSearch}
              aria-label="Search workspace"
              data-testid="button-global-search"
              className="hidden sm:flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-[11px]"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Search workspace</span>
              <kbd className="hidden lg:inline text-[9px] mono-font bg-muted px-1.5 py-0.5 rounded-md">⌘ K</kbd>
            </button>
            <button
              onClick={openSearch}
              aria-label="Search workspace"
              data-testid="button-mobile-search"
              className="sm:hidden h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                data-testid="button-notifications"
                className="relative h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-border bg-card p-4 shadow-xl">
                  <p className="text-[12px] font-semibold">You are up to date</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">New activity and due work will appear here as your workspace changes.</p>
                  <button onClick={() => setNotificationsOpen(false)} className="mt-3 text-[11px] font-semibold text-primary hover:underline" data-testid="button-dismiss-notifications">Dismiss</button>
                </div>
              )}
            </div>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              data-testid="button-topbar-theme"
              className="hidden sm:flex h-10 w-10 rounded-xl border border-border bg-card items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 border border-transparent hover:border-border hover:bg-card transition-colors" data-testid="button-user-menu">
                    <span className="h-8 w-8 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold">
                      {user.name?.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    <span className="hidden md:block text-[12px] font-semibold max-w-[100px] truncate">{user.name}</span>
                    <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-1.5">
                  <div className="px-2.5 py-2">
                    <p className="text-[12px] font-semibold truncate">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer" data-testid="link-topbar-profile">Profile settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void logout()} className="text-destructive cursor-pointer" data-testid="button-topbar-signout">Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <button className="lg:hidden fixed inset-0 top-[72px] z-30 bg-foreground/20 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <div className="lg:hidden fixed top-[72px] left-0 right-0 z-40 border-b border-border bg-card p-3 shadow-xl">
            <nav className="grid grid-cols-2 gap-1.5">
              {MOBILE_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  href={href}
                  key={href}
                  onClick={() => setMobileOpen(false)}
                  data-testid={`link-mobile-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-3 text-[12px] min-h-[44px] transition-colors",
                    isActive(href) ? "bg-secondary text-secondary-foreground font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}