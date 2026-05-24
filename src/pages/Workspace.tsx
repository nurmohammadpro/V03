import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { AccountPopup } from "@/components/shared/AccountPopup";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
import FileTree from "@/components/workspace/FileTree";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import { EnvVarsDialog } from "@/components/workspace/EnvVarsDialog";
import { AuditDialog } from "@/components/workspace/AuditDialog";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { createChatMessage } from "@/lib/sse";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import {
  ArrowLeft,
  Code2,
  FolderTree,
  History,
  KeyRound,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Sparkles,
  PlaySquare,
} from "lucide-react";

const FRAMEWORKS = ["Next.js", "MERN", "Laravel", "Django", "NestJS"] as const;

const MOCK_RESPONSES: Record<string, { text: string; files: any[] }> = {
  "Next.js": {
    text: "Generating a Next.js project with App Router, TypeScript, Tailwind CSS, and Prisma...\n\nCreating project structure...\nSetting up pages and API routes...\nConfiguring database schema...\nDone! Your Next.js project is ready.",
    files: [
      {
        name: "src",
        path: "src",
        type: "directory",
        children: [
          {
            name: "app",
            path: "src/app",
            type: "directory",
            children: [
              {
                name: "layout.tsx",
                path: "src/app/layout.tsx",
                type: "file",
                content:
                  "export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>{children}</body>\n    </html>\n  );\n}",
                language: "tsx",
              },
              {
                name: "page.tsx",
                path: "src/app/page.tsx",
                type: "file",
                content: "export default function Home() {\n  return <h1>Hello V03</h1>;\n}",
                language: "tsx",
              },
            ],
          },
          {
            name: "components",
            path: "src/components",
            type: "directory",
            children: [
              {
                name: "Header.tsx",
                path: "src/components/Header.tsx",
                type: "file",
                content: "export default function Header() {\n  return <header>V03 App</header>;\n}",
                language: "tsx",
              },
            ],
          },
        ],
      },
      {
        name: "package.json",
        path: "package.json",
        type: "file",
        content: JSON.stringify(
          { name: "v03-nextjs", version: "1.0.0", scripts: { dev: "next dev", build: "next build" } },
          null,
          2
        ),
        language: "json",
      },
      {
        name: "tsconfig.json",
        path: "tsconfig.json",
        type: "file",
        content: JSON.stringify(
          { compilerOptions: { target: "es2017", lib: ["dom", "dom.iterable", "esnext"], module: "esnext" } },
          null,
          2
        ),
        language: "json",
      },
    ],
  },
  MERN: {
    text: "Building a MERN stack app with Express, React, MongoDB, and Node.js...\n\nScaffolding backend...\nCreating React frontend with Vite...\nSetting up MongoDB models...\nDone! Your MERN app is ready to run.",
    files: [
      {
        name: "server",
        path: "server",
        type: "directory",
        children: [
          {
            name: "index.js",
            path: "server/index.js",
            type: "file",
            content:
              "const express = require(\"express\");\nconst app = express();\napp.use(express.json());\napp.listen(5000, () => console.log(\"Server running\"));",
            language: "js",
          },
          {
            name: "models",
            path: "server/models",
            type: "directory",
            children: [
              {
                name: "User.js",
                path: "server/models/User.js",
                type: "file",
                content:
                  "const mongoose = require(\"mongoose\");\nconst userSchema = new mongoose.Schema({ name: String, email: String });\nmodule.exports = mongoose.model(\"User\", userSchema);",
                language: "js",
              },
            ],
          },
        ],
      },
      {
        name: "client",
        path: "client",
        type: "directory",
        children: [
          {
            name: "src",
            path: "client/src",
            type: "directory",
            children: [
              {
                name: "App.jsx",
                path: "client/src/App.jsx",
                type: "file",
                content: "function App() { return <h1>MERN App</h1>; }\nexport default App;",
                language: "jsx",
              },
            ],
          },
        ],
      },
    ],
  },
  Laravel: {
    text: "Scaffolding a Laravel application with Blade views, Eloquent ORM, and Sanctum auth...\n\nSetting up Laravel project...\nCreating models and migrations...\nConfiguring routes and controllers...\nDone! Laravel project generated.",
    files: [
      {
        name: "app",
        path: "app",
        type: "directory",
        children: [
          {
            name: "Models",
            path: "app/Models",
            type: "directory",
            children: [
              {
                name: "User.php",
                path: "app/Models/User.php",
                type: "file",
                content:
                  "<?php\nnamespace App\\Models;\nuse Illuminate\\Database\\Eloquent\\Model;\nclass User extends Model { protected $fillable = [\"name\", \"email\"]; }",
                language: "php",
              },
            ],
          },
        ],
      },
    ],
  },
  Django: {
    text: "Creating a Django project with models, views, and templates...\n\nConfiguring Django settings...\nSetting up URL patterns...\nCreating database models...\nDone! Django project is ready.",
    files: [
      {
        name: "myapp",
        path: "myapp",
        type: "directory",
        children: [
          {
            name: "models.py",
            path: "myapp/models.py",
            type: "file",
            content:
              "from django.db import models\n\nclass Item(models.Model):\n    name = models.CharField(max_length=100)\n    created_at = models.DateTimeField(auto_now_add=True)",
            language: "py",
          },
          {
            name: "views.py",
            path: "myapp/views.py",
            type: "file",
            content:
              "from django.shortcuts import render\nfrom .models import Item\n\ndef home(request):\n    items = Item.objects.all()\n    return render(request, \"home.html\", {\"items\": items})",
            language: "py",
          },
        ],
      },
    ],
  },
  NestJS: {
    text: "Bootstrapping a NestJS application with modules, controllers, and services...\n\nSetting up NestJS project...\nCreating modules and controllers...\nConfiguring dependency injection...\nDone! NestJS project is ready.",
    files: [
      {
        name: "src",
        path: "src",
        type: "directory",
        children: [
          {
            name: "app.module.ts",
            path: "src/app.module.ts",
            type: "file",
            content:
              "import { Module } from '@nestjs/common';\nimport { AppController } from './app.controller';\nimport { AppService } from './app.service';\n\n@Module({\n  imports: [],\n  controllers: [AppController],\n  providers: [AppService],\n})\nexport class AppModule {}",
            language: "ts",
          },
          {
            name: "app.controller.ts",
            path: "src/app.controller.ts",
            type: "file",
            content:
              "import { Controller, Get } from '@nestjs/common';\nimport { AppService } from './app.service';\n\n@Controller()\nexport class AppController {\n  constructor(private readonly appService: AppService) {}\n  @Get()\n  getHello(): string { return this.appService.getHello(); }\n}",
            language: "ts",
          },
        ],
      },
    ],
  },
};

function buildFileNodes(files: any[]): any[] {
  return files.map((file: any) => {
    if (file.type === "directory" && file.children) {
      return { ...file, children: buildFileNodes(file.children) };
    }
    return file;
  });
}

function WorkspaceMessage({ role, content, isStreaming }: { role: "user" | "assistant" | "system"; content: string; isStreaming?: boolean }) {
  const isUser = role === "user";
  const isSystem = role === "system";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] md:max-w-[78%] ${
          isUser
            ? "bg-[var(--app-surface)] text-[var(--app-text)]"
            : isSystem
            ? "bg-[var(--app-panel)] text-[var(--app-text-muted)]"
            : "text-[var(--app-text)]"
        } rounded-[8px] px-4 py-3 text-sm leading-7`}
      >
        {role === "assistant" && (
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--app-text-dim)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]" />
            Builder
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">{content}</div>
        {isStreaming && (
          <span className="ml-1 inline-block h-4 w-1 rounded-full bg-[var(--app-accent)] align-middle animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default function Workspace(props: { params: { projectId: string } }) {
  const { user, loading, logout } = useAuth();
  const messages = useWorkspaceStore((s) => s.messages);
  const selectedFramework = useWorkspaceStore((s) => s.selectedFramework);
  const isGenerating = useWorkspaceStore((s) => s.isGenerating);
  const addMessage = useWorkspaceStore((s) => s.addMessage);
  const appendToLastAssistantMessage = useWorkspaceStore((s) => s.appendToLastAssistantMessage);
  const updateLastAssistantMessage = useWorkspaceStore((s) => s.updateLastAssistantMessage);
  const setFiles = useWorkspaceStore((s) => s.setFiles);
  const setIsGenerating = useWorkspaceStore((s) => s.setIsGenerating);
  const setSelectedFramework = useWorkspaceStore((s) => s.setSelectedFramework);
  const activeFileContent = useWorkspaceStore((s) => s.activeFileContent);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const files = useWorkspaceStore((s) => s.files);
  const setProjectId = useWorkspaceStore((s) => s.setProjectId);
  const refreshFileTree = useWorkspaceStore((s) => s.refreshFileTree);
  const isPreviewStarting = useWorkspaceStore((s) => s.isPreviewStarting);
  const isPreviewReady = useWorkspaceStore((s) => s.isPreviewReady);

  const projectId = props?.params?.projectId;

  const [input, setInput] = useState("");
  const [framework, setFramework] = useState(selectedFramework);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1280;
  });
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"files" | "chat">("files");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [generationRuns, setGenerationRuns] = useState<
    Array<{ id: string; status: string; startedAt: string; finishedAt: string | null }>
  >([]);

  const handleSignOut = async () => {
    await logout();
    window.location.replace("/");
  };

  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);
    void refreshFileTree();
    void api.getProjectGenerations(projectId).then((res) => setGenerationRuns(res.runs)).catch(() => {});
  }, [projectId, refreshFileTree, setProjectId]);

  useEffect(() => {
    if (loading || !user?.isAdmin) return;
    window.location.replace("/admin/overview");
  }, [loading, user?.isAdmin]);

  if (loading || user?.isAdmin) {
    return null;
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeFileContent || files.length > 0) {
      setCodePanelOpen(true);
    }
  }, [activeFileContent, files.length]);

  const statusLabel = useMemo(() => {
    if (isGenerating) return "Generating";
    if (isPreviewStarting) return "Starting preview";
    if (isPreviewReady) return "Preview ready";
    if (activeFileContent) return "Ready";
    return "Idle";
  }, [activeFileContent, isGenerating, isPreviewReady, isPreviewStarting]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isGenerating) return;
      if (!projectId) {
        toast.error("Missing project id");
        return;
      }

      addMessage(createChatMessage("user", content));
      setIsGenerating(true);
      addMessage(createChatMessage("assistant", ""));

      try {
        const session = supabase
          ? (await supabase.auth.getSession()).data.session
          : null;

        const res = await fetch(`/api/projects/${projectId}/generations/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            prompt: content,
            intent: "app",
            applyMode: "auto_apply",
            framework,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Gateway responded with ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            const parsed = parseSseBlock(block);
            if (!parsed) continue;

            if (parsed.event === "text_delta") {
              const text = typeof (parsed.data as any)?.text === "string" ? (parsed.data as any).text : "";
              if (text) appendToLastAssistantMessage(text);
            }

            if (parsed.event === "done") {
              const text = typeof (parsed.data as any)?.text === "string" ? (parsed.data as any).text : "";
              if (text) updateLastAssistantMessage(text);
              await refreshFileTree();
              const res2 = await api.getProjectGenerations(projectId);
              setGenerationRuns(res2.runs);
            }
          }
        }
      } catch (err: any) {
        if (import.meta.env.DEV) {
          const mock = MOCK_RESPONSES[framework] ?? MOCK_RESPONSES["Next.js"];
          const words = mock.text.split(" ");

          for (let i = 0; i < words.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 20));
            appendToLastAssistantMessage(words[i] + (i < words.length - 1 ? " " : ""));
          }

          updateLastAssistantMessage(mock.text);
          setFiles(buildFileNodes(mock.files));
          toast.error(err?.message || "Generation failed");
        } else {
          const message = String(err?.message || "Generation failed");
          updateLastAssistantMessage(`Generation failed: ${message}`);
          toast.error(message);
        }
      }

      setIsGenerating(false);
    },
    [addMessage, appendToLastAssistantMessage, framework, isGenerating, setFiles, setIsGenerating, updateLastAssistantMessage]
  );

  function parseSseBlock(block: string): { event: string; data: unknown } | null {
    const lines = block.split("\n").map((line) => line.trimEnd());
    let event = "message";
    const dataLines: string[] = [];
    for (const line of lines) {
      if (!line) continue;
      if (line.startsWith("event:")) {
        event = line.slice(6).trim() || "message";
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (dataLines.length === 0) return null;
    const raw = dataLines.join("\n");
    try {
      return { event, data: JSON.parse(raw) };
    } catch {
      return { event, data: raw };
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim() || isGenerating) return;

    sendMessage(input.trim());
    setInput("");
    setSidebarOpen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  const promptHints = [
    "Build a minimal B2B dashboard with usage analytics and billing health.",
    "Create a project management app with team roles and Kanban views.",
    "Generate a landing page plus admin console for a SaaS launch.",
  ];

  return (
    <div className="min-h-[100dvh] bg-[var(--app-bg)] text-[var(--app-text)]">
      <CommandPalette />
      <EnvVarsDialog open={envOpen} onOpenChange={setEnvOpen} projectId={projectId} />
      <AuditDialog open={auditOpen} onOpenChange={setAuditOpen} projectId={projectId} />
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[var(--app-overlay)] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close file panel"
        />
      )}

      {codePanelOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[var(--app-overlay)] xl:hidden"
          onClick={() => setCodePanelOpen(false)}
          aria-label="Close code panel"
        />
      )}

      <div className="flex min-h-[100dvh] w-full flex-col px-3 py-3 sm:px-4">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_88%,transparent)] px-1 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-[8px] bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? "Collapse file panel" : "Expand file panel"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>

            <Link href="/dashboard" className="flex items-center sm:hidden">
              <img src="/v03.svg" alt="v03" className="h-4 w-auto" />
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--app-panel)] px-3 py-2 text-sm text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[14px] font-medium tracking-[-0.02em] sm:text-[14px]">Workspace</h1>
                <Badge className="rounded-[6px] border-0 bg-[var(--app-panel)] px-2 py-0.5 text-[10px] font-normal text-[var(--app-text-muted)]">
                  {statusLabel}
                </Badge>
              </div>
              <p className="text-xs text-[var(--app-text-dim)]">Prompt, files, and output.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionMenu
              align="right"
              label="Select framework"
              buttonClassName="h-9 w-auto min-w-[124px] gap-2 px-3 text-sm"
              buttonContent={<span>{framework}</span>}
              items={FRAMEWORKS.map((fw) => ({
                label: fw,
                onSelect: () => {
                  setFramework(fw);
                  setSelectedFramework(fw);
                  toast.success(`Framework set to ${fw}`);
                },
              }))}
            />

            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-[8px] border-0 bg-[var(--app-panel)] px-3 text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
              onClick={() => setEnvOpen(true)}
            >
              <KeyRound className="h-4 w-4" />
              Env
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-[8px] border-0 bg-[var(--app-panel)] px-3 text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
              onClick={() => setAuditOpen(true)}
            >
              <History className="h-4 w-4" />
              Audit
            </Button>

            <ThemeToggle />

            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-[8px] border-0 bg-[var(--app-panel)] px-3 text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] xl:hidden"
              onClick={() => setCodePanelOpen(true)}
            >
              <Code2 className="h-4 w-4" />
              Code
            </Button>
          </div>
        </header>

        <div
          className={`grid flex-1 gap-3 ${
            sidebarOpen
              ? "xl:grid-cols-[240px_minmax(0,1fr)_minmax(0,2fr)]"
              : "xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
          }`}
        >
          <aside
            className={`fixed inset-y-[78px] left-3 z-40 w-[240px] rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl transition-transform lg:left-4 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-[115%]"
            } ${
              sidebarOpen ? "xl:relative xl:inset-auto xl:left-auto xl:z-auto xl:w-auto xl:translate-x-0" : "xl:hidden"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Project context</p>
                  <p className="mt-1 text-sm font-normal text-[var(--app-text)]">{framework}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-[8px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] xl:hidden"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close side panel"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>

              <div className="border-b border-[var(--app-border)] px-3 py-2">
                <div className="flex gap-1">
                  {[
                    { id: "files" as const, label: "Files", icon: FolderTree },
                    { id: "chat" as const, label: "Chat", icon: MessageSquare },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSidebarTab(tab.id)}
                      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-normal transition-colors ${
                        sidebarTab === tab.id
                          ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                          : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3">
                {sidebarTab === "files" ? (
                  files.length > 0 ? (
                    <FileTree />
                  ) : (
                    <div className="py-8 text-center">
                      <FolderTree className="mx-auto h-6 w-6 text-[var(--app-text-dim)]" />
                      <p className="mt-3 text-xs text-[var(--app-text-muted)]">
                        Generate a project to populate the file tree.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-[8px] bg-[var(--app-panel-2)] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Generations</p>
                      <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                        {generationRuns.length} run{generationRuns.length === 1 ? "" : "s"} logged.
                      </p>
                      <div className="mt-3 space-y-2">
                        {generationRuns.slice(0, 5).map((run) => (
                          <div key={run.id} className="flex items-center justify-between gap-3 text-xs text-[var(--app-text-muted)]">
                            <span className="truncate">{run.id.slice(0, 8)}</span>
                            <span className="shrink-0 rounded-full bg-[var(--app-panel)] px-2 py-0.5 text-[10px] text-[var(--app-text-dim)]">
                              {run.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[8px] bg-[var(--app-panel-2)] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Conversation</p>
                      <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                        {messages.length} message{messages.length === 1 ? "" : "s"} in this session.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {messages.slice(-4).map((msg) => (
                        <div key={msg.id} className="border-b border-[var(--app-border)] pb-2 text-xs text-[var(--app-text-muted)]">
                          <div className="mb-1 uppercase tracking-[0.1em] text-[var(--app-text-dim)]">{msg.role}</div>
                          <div className="line-clamp-3">{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--app-border)] px-3 py-3">
                <AccountPopup
                  name={user?.email?.split("@")[0] || "Guest"}
                  email={user?.email || "guest@v03.tech"}
                  avatar={
                    <Avatar size="sm">
                      <AvatarFallback className="bg-[var(--app-surface)] text-[var(--app-text-muted)]">
                        {user?.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  }
                  onSignOut={handleSignOut}
                />
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl">
            <div className="border-b border-[var(--app-border)] px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Prompt loop</p>
                  <h2 className="mt-2 text-[14px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
                    Build from one instruction
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-[6px] border-0 bg-[var(--app-panel-2)] px-2.5 py-1 text-[11px] font-normal text-[var(--app-text-muted)]">
                    {files.length} root items
                  </Badge>
                  <Badge className="rounded-[6px] border-0 bg-[var(--app-panel-2)] px-2.5 py-1 text-[11px] font-normal text-[var(--app-text-muted)]">
                    {framework}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {promptHints.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setInput(hint)}
                    className="rounded-[8px] bg-[var(--app-panel-2)] px-3 py-1.5 text-left text-xs text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {messages.length === 0 ? (
                <div className="flex min-h-full items-center justify-center">
                  <div className="max-w-[560px]">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Session ready</p>
                    <h3 className="mt-3 text-[14px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
                      Describe the app you want to build.
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">
                      Use clear product intent, stack, and constraints.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <div className="inline-flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
                        <Sparkles className="h-4 w-4 text-[var(--app-accent)]" />
                        Prompt-to-structure
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
                        <Code2 className="h-4 w-4 text-[var(--app-accent)]" />
                        File-aware output
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
                        <Code2 className="h-4 w-4 text-[var(--app-accent)]" />
                        Preview-ready
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((msg) => (
                    <WorkspaceMessage
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      isStreaming={msg.isStreaming}
                    />
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-[var(--app-border)] px-4 py-4 sm:px-5">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="rounded-[8px] bg-[var(--app-panel-2)] px-4 py-3">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Describe the app you want to build..."
                    disabled={isGenerating}
                    rows={1}
                    className="max-h-40 w-full resize-none bg-transparent text-sm leading-7 text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-dim)]"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSubmit(event);
                      }
                    }}
                    onInput={(event) => {
                      const el = event.currentTarget;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--app-text-dim)]">
                    Be specific about product intent, stack, and UI constraints.
                  </p>
                  <Button
                    type="submit"
                    disabled={isGenerating || !input.trim()}
                    className="rounded-[8px] bg-[var(--app-accent)] px-4 text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)] disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                    {isGenerating ? "Generating" : "Send prompt"}
                  </Button>
                </div>
              </form>
            </div>
          </section>

          <aside
            className={`fixed inset-y-[78px] right-3 z-40 w-[min(720px,calc(100vw-24px))] rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl transition-transform xl:static xl:inset-auto xl:z-auto xl:w-auto ${
              codePanelOpen ? "translate-x-0" : "translate-x-[110%] xl:translate-x-0"
            }`}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-[var(--app-border)] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Output</p>
                    <p className="mt-1 text-sm font-normal text-[var(--app-text)]">
                      {activeFilePath || "No file selected"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-[var(--app-text-dim)]">
                      Cmd/Ctrl+P to open files
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-[8px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] xl:hidden"
                      onClick={() => setCodePanelOpen(false)}
                    >
                      <PanelLeftClose className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-b border-[var(--app-border)] px-4 py-2 text-xs text-[var(--app-text-dim)]">
                {activeFileContent
                  ? "Use Preview/Code tabs in the header."
                  : "Generate a project or select a file."}
              </div>

              <div className="min-h-0 flex-1">
                {activeFileContent || files.length > 0 ? (
                  <WorkspaceLayout />
                ) : (
                  <div className="flex h-full items-center justify-center px-6">
                    <div className="max-w-[320px] text-center">
                      <Code2 className="mx-auto h-8 w-8 text-[var(--app-text-dim)]" />
                      <p className="mt-3 text-sm text-[var(--app-text-muted)]">
                        Generate a project first. This panel is reserved for code and preview.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--app-border)] px-4 py-2.5 text-xs text-[var(--app-text-muted)]">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-success)]" />
                  {isGenerating ? "Generating output" : activeFileContent ? "Output ready" : "Awaiting prompt"}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
