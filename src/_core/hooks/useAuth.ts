import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import type { AuthActor } from "@/lib/types";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

function readStoredActor() {
  const stored = localStorage.getItem("v03-user");
  if (!stored) return null;

  try {
    return JSON.parse(stored) as AuthActor;
  } catch {
    return null;
  }
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/" } = options ?? {};
  const [user, setUser] = useState<AuthActor | null>(() => readStoredActor());
  const [loading, setLoading] = useState(() => !readStoredActor());

  const clearLocalState = useCallback(() => {
    localStorage.removeItem("v03-user");
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) {
      clearLocalState();
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      clearLocalState();
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      localStorage.setItem("v03-user", JSON.stringify(res.user));
      setUser(res.user);
    } catch {
      clearLocalState();
    } finally {
      setLoading(false);
    }
  }, [clearLocalState]);

  useEffect(() => {
    const stored = readStoredActor();
    if (stored) {
      setUser(stored);
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        clearLocalState();
        setLoading(false);
        return;
      }

      void refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearLocalState, refresh]);

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    clearLocalState();
  }, [clearLocalState]);

  const state = useMemo(
    () => ({
      user,
      loading,
      error: hasSupabaseEnv ? null : "Missing Supabase environment variables",
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user?.isAdmin),
    }),
    [user, loading],
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, loading, state.user]);

  return {
    ...state,
    refresh,
    logout,
  };
}
