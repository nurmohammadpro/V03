import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import api from "@/lib/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  legalText?: string;
  showEmailAuth?: boolean;
}

const providers = [
  { key: "github", label: "GitHub", logo: <GitHubMark /> },
  { key: "google", label: "Google", logo: <GoogleMark /> },
  { key: "apple", label: "Apple", logo: <AppleMark /> },
] as const;

type PanelMode = "auth" | "reset";

function getRedirectTarget(user: { isAdmin: boolean }) {
  return user.isAdmin ? "/admin/overview" : "/dashboard";
}

export function AuthModal({
  isOpen,
  onClose,
  title = "Welcome to V03",
  legalText = "By signing in, you agree to our Terms of Service and Privacy Policy",
  showEmailAuth = true,
}: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [panelMode, setPanelMode] = useState<PanelMode>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const tabClass = "data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 font-light";
  const inputClass =
    "bg-black/40 border border-white/10 text-white placeholder-white/30 focus:border-white/20";

  const resetLocalState = () => {
    setPassword("");
    setConfirmPassword("");
  };

  const completePasswordSignIn = async () => {
    const res = await api.getMe();
    localStorage.setItem("v03-user", JSON.stringify(res.user));
    onClose();
    window.location.href = getRedirectTarget(res.user);
  };

  const handleOAuthSignIn = async (provider: "github" | "google" | "apple") => {
    if (!supabase || !hasSupabaseEnv) {
      toast.error("Supabase auth is not configured yet.");
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start OAuth login.");
      setIsLoading(false);
    }
  };

  const handlePasswordSignIn = async () => {
    if (!supabase || !hasSupabaseEnv) {
      toast.error("Supabase auth is not configured yet.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      toast.error("Email and password are required.");
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      toast.success("Signed in successfully.");
      await completePasswordSignIn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignUp = async () => {
    if (!supabase || !hasSupabaseEnv) {
      toast.error("Supabase auth is not configured yet.");
      return;
    }

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error("Email and password fields are required.");
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
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Account created. Confirm your email before signing in.");
      setActiveTab("signin");
      resetLocalState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordRequest = async () => {
    if (!supabase || !hasSupabaseEnv) {
      toast.error("Supabase auth is not configured yet.");
      return;
    }

    if (!resetEmail.trim()) {
      toast.error("Enter your email address first.");
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast.success("Password reset email sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send password reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderProviders = () => (
    <div className="space-y-2">
      {providers.map((provider) => (
        <Button
          key={provider.key}
          onClick={() => void handleOAuthSignIn(provider.key)}
          disabled={isLoading}
          className="w-full rounded-lg border border-white/10 bg-white/10 py-2 font-light text-white transition-all duration-[var(--duration-slow)] hover:bg-white/15 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">{provider.logo}</span>
              Continue with {provider.label}
            </>
          )}
        </Button>
      ))}
    </div>
  );

  const renderPasswordField = ({
    value,
    onChange,
    placeholder,
    visible,
    onToggle,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    visible: boolean;
    onToggle: () => void;
  }) => (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-white/40 transition-colors hover:text-white/70"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  const renderResetPanel = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-white/88">Reset password</h3>
        <p className="text-sm font-light text-white/45">
          Enter your email and we will send you a reset link.
        </p>
      </div>
      <div className="space-y-3">
        <Input
          type="email"
          placeholder="Email"
          value={resetEmail}
          onChange={(event) => setResetEmail(event.target.value)}
          className={inputClass}
        />
        <Button
          onClick={() => void handleResetPasswordRequest()}
          disabled={isLoading}
          className="w-full border border-white/10 bg-white/10 font-light text-white hover:bg-white/15"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending reset link...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </div>
      <button
        type="button"
        onClick={() => setPanelMode("auth")}
        className="text-sm font-light text-white/45 transition-colors hover:text-white/70"
      >
        Back to sign in
      </button>
    </div>
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) {
          setPanelMode("auth");
        }
        onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-[radial-gradient(circle_at_top,_rgba(76,137,245,0.18),_transparent_34%),radial-gradient(circle_at_80%_20%,_rgba(49,194,142,0.08),_transparent_24%),rgba(1,4,8,0.68)] backdrop-blur-md" />
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-md overflow-hidden rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,22,0.94),rgba(8,11,16,0.96))] shadow-[var(--shadow-xl)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-[var(--duration-slow)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(76,137,245,0.16),_transparent_36%),radial-gradient(circle_at_80%_18%,_rgba(49,194,142,0.07),_transparent_24%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] opacity-[0.10] [mask-image:radial-gradient(circle_at_center,black_35%,transparent_82%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/12" />
          <div className="relative">
            <DialogClose asChild>
              <button
                type="button"
                className="absolute right-0 top-0 inline-flex h-6 w-6 items-center justify-center rounded-sm border border-white/10 bg-white/5 p-1 text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label="Close authentication modal"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
            <DialogHeader className="mb-5">
              <DialogTitle className="font-heading text-center text-2xl font-normal">
                <span className="bg-gradient-to-r from-white/80 to-cyan-300 bg-clip-text text-transparent">
                  {title === "Welcome to V03" ? (
                    <>
                      Welcome to <span className="font-mono uppercase tracking-[0.14em] text-white">V03</span>
                    </>
                  ) : (
                    title
                  )}
                </span>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Sign in with email and password or continue with Google, GitHub, or Apple.
              </DialogDescription>
            </DialogHeader>

            {panelMode === "reset" ? (
              renderResetPanel()
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 border border-white/10 bg-black/40">
                  <TabsTrigger value="signin" className={tabClass}>
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className={tabClass}>
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6 space-y-4">
                  <p className="mb-4 text-center text-sm font-light text-white/50">
                    Sign in with your account to keep building.
                  </p>

                  {renderProviders()}

                  {showEmailAuth ? (
                    <>
                      <Separator label="or" className="my-4" />
                      <div className="space-y-3">
                        <Input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(event) => {
                            setEmail(event.target.value);
                            setResetEmail(event.target.value);
                          }}
                          className={inputClass}
                        />
                        {renderPasswordField({
                          value: password,
                          onChange: setPassword,
                          placeholder: "Password",
                          visible: showPassword,
                          onToggle: () => setShowPassword((current) => !current),
                        })}
                        <Button
                          onClick={() => void handlePasswordSignIn()}
                          disabled={isLoading}
                          className="w-full border border-white/10 bg-white/10 font-light text-white hover:bg-white/15"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs font-light text-white/35">
                        <span>Email sign-in requires confirmed email addresses.</span>
                        <button
                          type="button"
                          onClick={() => setPanelMode("reset")}
                          className="shrink-0 text-white/52 transition-colors hover:text-white/74"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </>
                  ) : null}
                </TabsContent>

                <TabsContent value="signup" className="mt-6 space-y-4">
                  <p className="mb-4 text-center text-sm font-light text-white/50">
                    Create your account. Email confirmation is required.
                  </p>

                  {renderProviders()}

                  {showEmailAuth ? (
                    <>
                      <Separator label="or" className="my-4 rounded-md" />
                      <div className="space-y-3">
                        <Input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className={inputClass}
                        />
                        {renderPasswordField({
                          value: password,
                          onChange: setPassword,
                          placeholder: "Password",
                          visible: showPassword,
                          onToggle: () => setShowPassword((current) => !current),
                        })}
                        {renderPasswordField({
                          value: confirmPassword,
                          onChange: setConfirmPassword,
                          placeholder: "Confirm password",
                          visible: showConfirmPassword,
                          onToggle: () => setShowConfirmPassword((current) => !current),
                        })}
                        <Button
                          onClick={() => void handlePasswordSignUp()}
                          disabled={isLoading}
                          className="w-full border border-white/10 bg-white/10 font-light text-white hover:bg-white/15"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating account...
                            </>
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </div>
                    </>
                  ) : null}
                </TabsContent>
              </Tabs>
            )}

            <p className="mt-6 text-center text-xs font-light text-white/20">{legalText}</p>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.72.5.1.68-.22.68-.5 0-.25-.01-1.06-.01-1.92-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.33 9.33 0 0 1 12 7.27c.85 0 1.7.12 2.5.36 1.9-1.33 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.05.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.18.6.69.5A10.25 10.25 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12.24 10.29v3.98h5.65c-.24 1.28-.96 2.36-2.04 3.09l3.3 2.59c1.92-1.82 3.03-4.49 3.03-7.67 0-.74-.07-1.45-.18-2.14h-9.76Z" />
      <path fill="#34A853" d="M12 22c2.76 0 5.08-.93 6.78-2.53l-3.3-2.59c-.92.63-2.09 1.01-3.48 1.01-2.67 0-4.94-1.86-5.75-4.36l-3.4 2.67A10 10 0 0 0 12 22Z" />
      <path fill="#4A90E2" d="M6.25 13.53A6.2 6.2 0 0 1 5.93 12c0-.53.11-1.04.32-1.53L2.85 7.8A10.2 10.2 0 0 0 2 12c0 1.61.38 3.13 1.05 4.47l3.2-2.94Z" />
      <path fill="#FBBC05" d="M12 6.11c1.5 0 2.85.53 3.91 1.56l2.93-2.98C17.07 2.98 14.76 2 12 2A10 10 0 0 0 3.05 7.8l3.4 2.67C7.06 7.97 9.33 6.11 12 6.11Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M16.7 12.9c0-2.07 1.7-3.06 1.78-3.11-1-1.47-2.56-1.67-3.11-1.69-1.32-.14-2.57.8-3.24.8-.67 0-1.7-.78-2.8-.76-1.45.02-2.79.85-3.53 2.16-1.5 2.64-.38 6.55 1.08 8.68.72 1.04 1.57 2.2 2.68 2.16 1.07-.04 1.48-.7 2.78-.7 1.31 0 1.66.7 2.8.67 1.16-.02 1.89-1.07 2.6-2.13.82-1.21 1.16-2.39 1.18-2.45-.03-.01-2.26-.88-2.26-3.63ZM14.47 6.79c.59-.73 1-1.75.89-2.79-.85.03-1.88.58-2.49 1.3-.55.64-1.03 1.67-.9 2.65.95.07 1.91-.49 2.5-1.16Z" />
    </svg>
  );
}
