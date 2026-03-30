import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { getCurrentUser, login as authLogin, logout as authLogout, User } from "@/lib/auth";
import { generateDemoTransactions } from "@/lib/transactions";

interface AuthContextType {
  user: User | null;
  refresh: () => void;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  const refresh = useCallback(() => {
    setUser(getCurrentUser());
  }, []);

  const login = useCallback((username: string, password: string) => {
    const result = authLogin(username, password);
    if (result.ok) {
      const u = getCurrentUser();
      if (u) generateDemoTransactions(u.username);
      setUser(getCurrentUser());
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
