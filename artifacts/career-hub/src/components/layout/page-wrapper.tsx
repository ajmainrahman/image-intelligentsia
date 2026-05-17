import { TopNav } from "./top-nav";
import { GlobalSearch } from "@/components/global-search";

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="min-h-[100dvh] bg-[#faf8f2] text-slate-800">
      <GlobalSearch />
      <TopNav />
      <main className="w-full">
        <div className="max-w-[1180px] mx-auto px-4 md:px-6 py-6 md:py-8 pb-16">
          {children}
        </div>
      </main>
    </div>
  );
}
