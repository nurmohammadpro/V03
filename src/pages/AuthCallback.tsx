import { useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    async function completeAuth() {
      if (!supabase) {
        toast.error("Supabase auth is not configured yet.");
        window.location.replace("/");
        return;
      }

      try {
        const code = new URL(window.location.href).searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        }

        const res = await api.getMe();
        localStorage.setItem("v03-user", JSON.stringify(res.user));
        window.location.replace(res.user.isAdmin ? "/admin/overview" : "/dashboard");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not complete sign-in.");
        window.location.replace("/");
      }
    }

    void completeAuth();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-[var(--app-text-muted)]">
      Finalizing sign-in...
    </div>
  );
}
