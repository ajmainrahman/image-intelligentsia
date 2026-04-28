import { Sidebar } from "./sidebar";

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar />
      <main className="pl-56 flex flex-col min-h-screen overflow-y-auto">
        <div className="flex-1 w-full max-w-[860px] mx-auto px-10 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
