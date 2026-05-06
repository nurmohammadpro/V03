import { useCallback, useEffect, useMemo, useState } from "react";
import { getLoginUrl } from "@/const";
import api from "@/lib/api";
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
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } = options ?? {};
  const [user, setUser] = useState<AuthActor | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("v03_token");

    if (!token) {
      localStorage.removeItem("v03-user");
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      localStorage.setItem("v03-user", JSON.stringify(res.user));
      setUser(res.user);
    } catch {
      localStorage.removeItem("v03-token");
      localStorage.removeItem("v03_token");
      localStorage.removeItem("v03-user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = readStoredActor();
    if (stored) {
      setUser(stored);
    }

    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    localStorage.removeItem("v03_token");
    localStorage.removeItem("v03-user");
    setUser(null);
  }, []);

  const state = useMemo(
    () => ({
      user,
      loading,
      error: null,
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
