import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Non-sensitive user info is cached in localStorage for instant render.
// The HttpOnly cookie is the real auth proof — we validate it on startup
// via GET /api/auth/me and clear this cache if the session is gone.
const USER_KEY = "atlas_user";

function loadCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

type AuthResponse = { user: AuthUser };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadCachedUser);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, validate the HttpOnly cookie by calling /auth/me.
  // This ensures stale localStorage data doesn't pass for a valid session.
  useEffect(() => {
    api<AuthResponse>("/auth/me")
      .then(({ user: serverUser }) => {
        setUser(serverUser);
        localStorage.setItem(USER_KEY, JSON.stringify(serverUser));
      })
      .catch(() => {
        // Cookie expired or absent — clear stale cache
        setUser(null);
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<AuthResponse>("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await api<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/signout", { method: "POST" });
    } catch {
      // Best-effort — clear local state regardless
    }
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
