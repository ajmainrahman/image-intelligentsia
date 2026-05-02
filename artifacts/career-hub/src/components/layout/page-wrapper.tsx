import { TopNav } from "./top-nav";

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <TopNav />
      <main className="w-full">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 pb-16">
          {children}
        </div>
      </main>
    </div>
  );
}
