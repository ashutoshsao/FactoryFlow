import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface Supervisor {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  token: string | null;
  supervisor: Supervisor | null;
  isAuthenticated: boolean;
  login: (token: string, supervisor: Supervisor) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "token";
const SUPERVISOR_KEY = "supervisor";

function loadStored(): { token: string | null; supervisor: Supervisor | null } {
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(SUPERVISOR_KEY);
  let supervisor: Supervisor | null = null;
  if (raw) {
    try {
      supervisor = JSON.parse(raw) as Supervisor;
    } catch {
      // ignore
    }
  }
  return { token, supervisor };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const { token: t, supervisor: s } = loadStored();
    setToken(t);
    setSupervisor(s);
    setHydrated(true);
  }, []);

  const login = useCallback((newToken: string, newSupervisor: Supervisor) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(SUPERVISOR_KEY, JSON.stringify(newSupervisor));
    setToken(newToken);
    setSupervisor(newSupervisor);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SUPERVISOR_KEY);
    setToken(null);
    setSupervisor(null);
  }, []);

  const isAuthenticated = !!token && hydrated;

  const value: AuthContextValue = {
    token,
    supervisor,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
