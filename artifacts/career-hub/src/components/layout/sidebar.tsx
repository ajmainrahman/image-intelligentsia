import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Target, 
  BookOpen, 
  Map, 
  Briefcase, 
  BellRing
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/progress", label: "Progress", icon: BookOpen },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/reminders", label: "Reminders", icon: BellRing },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground shadow-sm">
            <Target className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Career Hub</span>
        </div>
      </div>
      
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 transition-colors",
                isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-foreground"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}