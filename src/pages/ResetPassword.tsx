import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function prepareRecovery() {
      if (!supabase) {
        toast.error("Supabase auth is not configured yet.");
        setLoading(false);
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        setReady(Boolean(session));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not prepare password recovery.");
      } finally {
        setLoading(false);
      }
    }

    void prepareRecovery();
  }, []);

  const helperText = useMemo(() => {
    if (loading) return "Preparing recovery session...";
    if (ready) return "Set your new password to complete account recovery.";
    return "This recovery link is invalid or expired. Request a new one from sign in.";
  }, [loading, ready]);

  const handleUpdatePassword = async () => {
    if (!supabase) {
      toast.error("Supabase auth is not configured yet.");
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      toast.error("Enter your new password twice.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      const res = await api.getMe();
      localStorage.setItem("v03-user", JSON.stringify(res.user));
      toast.success("Password updated successfully.");
      window.location.replace(res.user.isAdmin ? "/admin/overview" : "/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-[14px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-[var(--shadow-lg)]">
        <div className="space-y-1">
          <h1 className="text-lg font-medium text-[var(--app-text)]">Reset password</h1>
          <p className="text-sm font-light text-[var(--app-text-muted)]">{helperText}</p>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking recovery session...
          </div>
        ) : ready ? (
          <div className="mt-6 space-y-3">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <Button
              onClick={() => void handleUpdatePassword()}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <Button variant="outline" className="w-full" onClick={() => window.location.replace("/")}>
              Back to sign in
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
