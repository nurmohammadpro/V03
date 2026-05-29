import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, ExternalLink, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface PushToGitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | undefined;
  projectName?: string;
}

type DialogState = "initial" | "connecting" | "pushing" | "done" | "error";

export function PushToGitHubDialog({ open, onOpenChange, projectId, projectName }: PushToGitHubDialogProps) {
  const [state, setState] = useState<DialogState>("initial");
  const [ghConnected, setGhConnected] = useState(false);
  const [ghLogin, setGhLogin] = useState<string | null>(null);
  const [repoName, setRepoName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  // Check GitHub connection status when dialog opens
  useEffect(() => {
    if (!open) return;
    setState("initial");
    setPushError(null);
    setRepoUrl(null);
    setRepoName(projectName ? projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 50) : `v03-project`);

    api.getGitHubStatus().then((res) => {
      setGhConnected(res.connected);
      setGhLogin(res.login);
    }).catch(() => {
      setGhConnected(false);
    });
  }, [open, projectName]);

  const handleConnect = async () => {
    try {
      setState("connecting");
      const { url } = await api.getGitHubUrl();
      // Store current location so we can return here
      sessionStorage.setItem("v03-github-redirect", window.location.href);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err?.message || "Failed to start GitHub connection");
      setState("initial");
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectGitHub();
      setGhConnected(false);
      setGhLogin(null);
      toast.success("GitHub disconnected");
    } catch (err: any) {
      toast.error(err?.message || "Failed to disconnect GitHub");
    }
  };

  const handlePush = async () => {
    if (!projectId) return;
    if (!repoName.trim()) {
      toast.error("Enter a repository name");
      return;
    }

    try {
      setState("pushing");
      setPushError(null);
      const res = await api.pushToGitHub(projectId, {
        repoName: repoName.trim(),
        isPrivate,
      });
      setRepoUrl(res.repoUrl);
      setState("done");
      toast.success("Pushed to GitHub successfully");
    } catch (err: any) {
      setPushError(err?.message || "Push failed");
      setState("error");
      toast.error(err?.message || "Failed to push to GitHub");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-[14px] border border-[var(--app-border)] bg-[var(--app-panel)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
            <GitHubLogo className="h-4 w-4" />
            Push to GitHub
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--app-text-dim)]">
            Push your project files to a GitHub repository.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* GitHub connection status */}
          <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {ghConnected ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-[var(--app-success)]" />
                    <span className="text-[var(--app-text)]">
                      Connected as <span className="font-medium">{ghLogin}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 text-[var(--app-text-dim)]" />
                    <span className="text-[var(--app-text-muted)]">Not connected to GitHub</span>
                  </>
                )}
              </div>
              {ghConnected ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="h-7 rounded-[6px] px-2 text-xs text-[var(--app-text-dim)] hover:text-[var(--app-danger)]"
                >
                  <Unlink className="mr-1 h-3 w-3" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConnect}
                  disabled={state === "connecting"}
                  className="h-7 rounded-[6px] bg-[var(--app-accent)] px-3 text-xs text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)]"
                >
                  {state === "connecting" ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <GitHubLogo className="mr-1 h-3 w-3" />
                  )}
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Repo configuration (only when connected) */}
          {ghConnected && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--app-text-muted)]">Repository name</label>
                <Input
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="my-v03-project"
                  disabled={state === "pushing" || state === "done"}
                  className="border-[var(--app-border)] bg-[var(--app-bg)] text-sm text-[var(--app-text)]"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex-1 rounded-[8px] border px-3 py-2 text-sm transition-colors ${
                    isPrivate
                      ? "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-text)]"
                      : "border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-muted)] hover:border-[var(--app-border-hover)]"
                  }`}
                >
                  🔒 Private
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex-1 rounded-[8px] border px-3 py-2 text-sm transition-colors ${
                    !isPrivate
                      ? "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-text)]"
                      : "border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-muted)] hover:border-[var(--app-border-hover)]"
                  }`}
                >
                  🌐 Public
                </button>
              </div>
            </div>
          )}

          {/* Error state */}
          {state === "error" && pushError && (
            <div className="rounded-[8px] bg-[var(--app-danger-soft)] px-3 py-2 text-xs text-[var(--app-danger)]">
              {pushError}
            </div>
          )}

          {/* Success state */}
          {state === "done" && repoUrl && (
            <div className="rounded-[8px] bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] px-3 py-2 text-xs text-[var(--app-success)]">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Pushed successfully!</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {state === "done" && repoUrl ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-8 rounded-[8px] border-[var(--app-border)] px-3 text-xs"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => window.open(repoUrl, "_blank")}
                  className="h-8 rounded-[8px] bg-[var(--app-accent)] px-3 text-xs text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)]"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open repo
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={state === "pushing"}
                  className="h-8 rounded-[8px] border-[var(--app-border)] px-3 text-xs"
                >
                  Cancel
                </Button>
                {ghConnected && (
                  <Button
                    type="button"
                    onClick={handlePush}
                    disabled={state === "pushing" || state === "done" || !repoName.trim()}
                    className="h-8 rounded-[8px] bg-[var(--app-accent)] px-3 text-xs text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)]"
                  >
                    {state === "pushing" ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Pushing...
                      </>
                    ) : (
                      <>
                    <GitHubLogo className="mr-1 h-3 w-3" />
                    Push to GitHub
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.72.5.1.68-.22.68-.5 0-.25-.01-1.06-.01-1.92-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.33 9.33 0 0 1 12 7.27c.85 0 1.7.12 2.5.36 1.9-1.33 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.05.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.18.6.69.5A10.25 10.25 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
    </svg>
  );
}
