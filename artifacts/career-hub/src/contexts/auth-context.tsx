import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  signIn: (name: string, email: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "career_hub_user";

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  const signIn = useCallback(async (name: string, email: string) => {
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Sign in failed");
    }

    const data = (await res.json()) as AuthUser;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setUser(data);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
