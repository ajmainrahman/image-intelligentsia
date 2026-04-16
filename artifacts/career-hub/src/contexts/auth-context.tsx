import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
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

const apiPath = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/auth`;

function getAuthUrls(action: "signin" | "signup" | "signout") {
  const path = `${apiPath}/${action}`;

  if (typeof window === "undefined") {
    return [path];
  }

  const urls = [path];
  const browserOrigin = window.location.origin;
  const proxyOrigin = `${window.location.protocol}//${window.location.hostname}`;

  if (window.location.port && proxyOrigin !== browserOrigin) {
    urls.unshift(`${proxyOrigin}${path}`);
  }

  return [...new Set(urls)];
}

async function callAuth(action: "signin" | "signup" | "signout", body?: object): Promise<AuthUser> {
  let lastError = "Request failed";

  for (const url of getAuthUrls(action)) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return data as AuthUser;
      }
      lastError = (data as { error?: string }).error ?? `Request failed (${res.status})`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Request failed";
    }
  }

  throw new Error(lastError);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await callAuth("signin", { email, password });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setUser(data);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const data = await callAuth("signup", { name, email, password });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setUser(data);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    callAuth("signout").catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
