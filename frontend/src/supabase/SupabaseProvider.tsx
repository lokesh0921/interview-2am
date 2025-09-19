import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";

// @refresh stable

type Ctx = {
  client: SupabaseClient;
  session: Session | null;
  initialized: boolean;
  signOut: () => Promise<void>;
};

const SupabaseCtx = createContext<Ctx>({
  client: undefined as any,
  session: null,
  initialized: false,
  signOut: async () => {},
});

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const client = useMemo(
    () =>
      createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string
      ),
    []
  );

  useEffect(() => {
    let mounted = true;
    client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setInitialized(true);
    });
    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, s) => {
        if (!mounted) return;
        setSession(s);
        setInitialized(true);
      }
    );
    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    const token = session?.access_token || "";
    if (token) localStorage.setItem("sb:token", token);
    else localStorage.removeItem("sb:token");
  }, [session]);

  const signOut = async () => {
    await client.auth.signOut();
  };

  return (
    <SupabaseCtx.Provider value={{ client, session, initialized, signOut }}>
      {children}
    </SupabaseCtx.Provider>
  );
};

export const useSupabase = () => useContext(SupabaseCtx);
