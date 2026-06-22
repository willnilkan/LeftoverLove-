import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "donor" | "receiver" | "volunteer" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;

  /** All roles granted to this user (from public.user_roles) */
  roles: AppRole[];

  /** Current UI mode (stored in localStorage) */
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;

  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  roles: [],
  activeRole: null,
  setActiveRole: () => {},
  signOut: async () => {},
});

const LS_KEY = "cgp_active_role";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);

  const chooseDefaultRole = (available: AppRole[]) => {
    const saved = (localStorage.getItem(LS_KEY) as AppRole | null) ?? null;
    if (saved && available.includes(saved)) return saved;
    if (available.includes("donor")) return "donor";
    if (available.includes("receiver")) return "receiver";
    return available[0] ?? null;
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      setRoles([]);
      setActiveRoleState(null);
      return;
    }

    const rs = (data ?? [])
      .map((r: any) => r.role as AppRole)
      .filter(Boolean);

    // Deduplicate
    const unique = Array.from(new Set(rs));
    setRoles(unique);

    const nextActive = chooseDefaultRole(unique);
    setActiveRoleState(nextActive);
    if (nextActive) localStorage.setItem(LS_KEY, nextActive);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Debug: log auth state changes
        // eslint-disable-next-line no-console
        console.debug('[useAuth] onAuthStateChange', _event, session);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer so state updates don't fight each other
          setTimeout(() => fetchRoles(session.user.id), 0);
        } else {
          setRoles([]);
          setActiveRoleState(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      // Debug: initial session
      // eslint-disable-next-line no-console
      console.debug('[useAuth] initial getSession', session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchRoles(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const setActiveRole = (role: AppRole) => {
    setActiveRoleState(role);
    localStorage.setItem(LS_KEY, role);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setActiveRoleState(null);
    localStorage.removeItem(LS_KEY);
  };

  const value = useMemo(() => ({
    user,
    session,
    loading,
    roles,
    activeRole,
    setActiveRole,
    signOut,
  }), [user, session, loading, roles, activeRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
