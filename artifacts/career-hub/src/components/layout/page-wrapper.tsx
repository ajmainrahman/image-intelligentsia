import { TopNav } from "./top-nav";
import { GlobalSearch } from "@/components/global-search";
import { Sidebar } from "./sidebar";

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="app-shell text-foreground">
      <GlobalSearch />
      <Sidebar />
      <div className="lg:pl-[248px]">
        <TopNav />
        <main className="w-full">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-6 md:py-8 pb-16">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
