import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import {
  connectSSE,
  createChatMessage,
  getChatSSEUrl,
  type ChatMessage,
} from "@/lib/sse";
import { ChevronDown, FolderTree, MessageSquare, Code2, Send, Terminal, Plus } from "lucide-react";

const FRAMEWORKS = ["Next.js", "MERN", "Laravel", "Django", "NestJS"];

// Mock responses for when backend is unavailable
const MOCK_RESPONSES: Record<string, { text: string; files: any[] }> = {
  "Next.js": {
    text: "Generating a Next.js project with App Router, TypeScript, Tailwind CSS, and Prisma...\n\nCreating project structure...\nSetting up pages and API routes...\nConfiguring database schema...\nDone! Your Next.js project is ready.",
    files: [
      { name: "src", path: "src", type: "directory", children: [
        { name: "app", path: "src/app", type: "directory", children: [
          { name: "layout.tsx", path: "src/app/layout.tsx", type: "file", content: "export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>{children}</body>\n    </html>\n  );\n}", language: "tsx" },
          { name: "page.tsx", path: "src/app/page.tsx", type: "file", content: "export default function Home() {\n  return <h1>Hello V03</h1>;\n}", language: "tsx" },
        ]},
        { name: "components", path: "src/components", type: "directory", children: [
          { name: "Header.tsx", path: "src/components/Header.tsx", type: "file", content: "export default function Header() {\n  return <header>V03 App</header>;\n}", language: "tsx" },
        ]},
      ]},
      { name: "package.json", path: "package.json", type: "file", content: JSON.stringify({ name: "v03-nextjs", version: "1.0.0", scripts: { dev: "next dev", build: "next build" } }, null, 2), language: "json" },
      { name: "tsconfig.json", path: "tsconfig.json", type: "file", content: JSON.stringify({ compilerOptions: { target: "es2017", lib: ["dom", "dom.iterable", "esnext"], module: "esnext" } }, null, 2), language: "json" },
    ],
  },
  "MERN": {
    text: "Building a MERN stack app with Express, React, MongoDB, and Node.js...\n\nScaffolding backend...\nCreating React frontend with Vite...\nSetting up MongoDB models...\nDone! Your MERN app is ready to run.",
    files: [
      { name: "server", path: "server", type: "directory", children: [
        { name: "index.js", path: "server/index.js", type: "file", content: "const express = require(\"express\");\nconst app = express();\napp.use(express.json());\napp.listen(5000, () => console.log(\"Server running\"));", language: "js" },
        { name: "models", path: "server/models", type: "directory", children: [
          { name: "User.js", path: "server/models/User.js", type: "file", content: "const mongoose = require(\"mongoose\");\nconst userSchema = new mongoose.Schema({ name: String, email: String });\nmodule.exports = mongoose.model(\"User\", userSchema);", language: "js" },
        ]},
      ]},
      { name: "client", path: "client", type: "directory", children: [
        { name: "src", path: "client/src", type: "directory", children: [
          { name: "App.jsx", path: "client/src/App.jsx", type: "file", content: "function App() { return <h1>MERN App</h1>; }\nexport default App;", language: "jsx" },
        ]},
      ]},
    ],
  },
  "Laravel": {
    text: "Scaffolding a Laravel application with Blade views, Eloquent ORM, and Sanctum auth...\n\nSetting up Laravel project...\nCreating models and migrations...\nConfiguring routes and controllers...\nDone! Laravel project generated.",
    files: [
      { name: "app", path: "app", type: "directory", children: [
        { name: "Models", path: "app/Models", type: "directory", children: [
          { name: "User.php", path: "app/Models/User.php", type: "file", content: "<?php\nnamespace App\\Models;\nuse Illuminate\\Database\\Eloquent\\Model;\nclass User extends Model { protected $fillable = [\"name\", \"email\"]; }", language: "php" },
        ]},
        { name: "Http", path: "app/Http", type: "directory", children: [
          { name: "Controllers", path: "app/Http/Controllers", type: "directory", children: [
            { name: "HomeController.php", path: "app/Http/Controllers/HomeController.php", type: "file", content: "<?php\nnamespace App\\Http\\Controllers;\nclass HomeController extends Controller { public function index() { return view(\"welcome\"); } }", language: "php" },
          ]},
        ]},
      ]},
      { name: "resources", path: "resources", type: "directory", children: [
        { name: "views", path: "resources/views", type: "directory", children: [
          { name: "welcome.blade.php", path: "resources/views/welcome.blade.php", type: "file", content: "<!DOCTYPE html>\n<html>\n<head><title>Laravel</title></head>\n<body><h1>Welcome</h1></body>\n</html>", language: "php" },
        ]},
      ]},
    ],
  },
  "Django": {
    text: "Creating a Django project with models, views, and templates...\n\nConfiguring Django settings...\nSetting up URL patterns...\nCreating database models...\nDone! Django project is ready.",
    files: [
      { name: "myapp", path: "myapp", type: "directory", children: [
        { name: "models.py", path: "myapp/models.py", type: "file", content: "from django.db import models\n\nclass Item(models.Model):\n    name = models.CharField(max_length=100)\n    created_at = models.DateTimeField(auto_now_add=True)", language: "py" },
        { name: "views.py", path: "myapp/views.py", type: "file", content: "from django.shortcuts import render\nfrom .models import Item\n\ndef home(request):\n    items = Item.objects.all()\n    return render(request, \"home.html\", {\"items\": items})", language: "py" },
        { name: "urls.py", path: "myapp/urls.py", type: "file", content: "from django.urls import path\nfrom . import views\n\nurlpatterns = [\n    path(\"\", views.home, name=\"home\"),\n]", language: "py" },
      ]},
    ],
  },
  "NestJS": {
    text: "Bootstrapping a NestJS application with modules, controllers, and services...\n\nSetting up NestJS project...\nCreating modules and controllers...\nConfiguring dependency injection...\nDone! NestJS project is ready.",
    files: [
      { name: "src", path: "src", type: "directory", children: [
        { name: "app.module.ts", path: "src/app.module.ts", type: "file", content: "import { Module } from '@nestjs/common';\nimport { AppController } from './app.controller';\nimport { AppService } from './app.service';\n\n@Module({\n  imports: [],\n  controllers: [AppController],\n  providers: [AppService],\n})\nexport class AppModule {}", language: "ts" },
        { name: "app.controller.ts", path: "src/app.controller.ts", type: "file", content: "import { Controller, Get } from '@nestjs/common';\nimport { AppService } from './app.service';\n\n@Controller()\nexport class AppController {\n  constructor(private readonly appService: AppService) {}\n  @Get()\n  getHello(): string { return this.appService.getHello(); }\n}", language: "ts" },
        { name: "app.service.ts", path: "src/app.service.ts", type: "file", content: "import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class AppService {\n  getHello(): string { return 'Hello NestJS!'; }\n}", language: "ts" },
      ]},
    ],
  },
};

function buildFileNodes(files: any[]): any[] {
  return files.map((f: any) => {
    if (f.type === "directory" && f.children) {
      return { ...f, children: buildFileNodes(f.children) };
    }
    return f;
  });
}

export default function Workspace() {
  const { user } = useAuth();
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

  const [input, setInput] = useState("");
  const [showFrameworkPicker, setShowFrameworkPicker] = useState(false);
  const [framework, setFramework] = useState(selectedFramework);
  const [sidebarTab, setSidebarTab] = useState<"files" | "chat">("files");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sseCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isGenerating) return;
      const userMsg = createChatMessage("user", content);
      addMessage(userMsg);

      setIsGenerating(true);
      const assistantMsg = createChatMessage("assistant", "");
      addMessage(assistantMsg);

      try {
        const url = getChatSSEUrl();
        if (url) {
          const cleanup = connectSSE(url, (data) => {
            if (data.content) {
              appendToLastAssistantMessage(data.content);
            }
            if (data.done) {
              updateLastAssistantMessage(
                useWorkspaceStore.getState().messages.findLast(
                  (m: ChatMessage) => m.role === "assistant"
                )?.content ?? ""
              );
              if (data.files) {
                setFiles(buildFileNodes(data.files));
              }
            }
          });
          sseCleanupRef.current = cleanup;
        } else {
          throw new Error("No SSE URL");
        }
      } catch {
        console.log("Backend unavailable, using mock response");
        const mock = MOCK_RESPONSES[framework] ?? MOCK_RESPONSES["Next.js"];
        const words = mock.text.split(" ");
        for (let i = 0; i < words.length; i++) {
          await new Promise((r) => setTimeout(r, 30));
          appendToLastAssistantMessage(words[i] + (i < words.length - 1 ? " " : ""));
        }
        updateLastAssistantMessage(mock.text);
        setFiles(buildFileNodes(mock.files));
      }

      setIsGenerating(false);
    },
    [framework, isGenerating, addMessage, appendToLastAssistantMessage, updateLastAssistantMessage, setFiles, setIsGenerating]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="h-screen w-screen bg-[#05070A] text-[#E6EDF3] flex overflow-hidden">
      {/* ===== Sidebar (260px fixed) ===== */}
      <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#0B0F14] border-r border-white/5 flex flex-col z-10">
        {/* Project header */}
        <div className="px-4 pt-5 pb-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-bold text-sm">
              v
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#E6EDF3] truncate">v03.tech</p>
              <p className="text-[11px] text-[#6B7280]">Workspace</p>
            </div>
          </div>
          {/* Framework selector */}
          <div className="relative">
            <button
              onClick={() => setShowFrameworkPicker(!showFrameworkPicker)}
              className="w-full bg-[#111827] hover:bg-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] font-medium transition-colors text-left flex items-center justify-between"
            >
              <span>{framework}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>
            {showFrameworkPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0F141A] border border-white/5 rounded-lg overflow-hidden z-20 shadow-xl">
                {FRAMEWORKS.map((fw) => (
                  <button
                    key={fw}
                    onClick={() => {
                      setFramework(fw);
                      setSelectedFramework(fw);
                      setShowFrameworkPicker(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                      fw === framework
                        ? "bg-[#1F2937] text-[#E6EDF3]"
                        : "text-[#9BA7B4] hover:bg-[#111827] hover:text-[#E6EDF3]"
                    }`}
                  >
                    {fw}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar tabs */}
        <div className="flex gap-0.5 mx-3 bg-[#111827] p-0.5 rounded-lg mb-3">
          {[
            { id: "files" as const, icon: FolderTree, label: "Files" },
            { id: "chat" as const, icon: MessageSquare, label: "Chat" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={`flex items-center gap-1.5 flex-1 justify-center px-2 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                sidebarTab === tab.id
                  ? "bg-[#1F2937] text-[#E6EDF3]"
                  : "text-[#6B7280] hover:text-[#9BA7B4]"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sidebar content */}
        <div className="flex-1 overflow-y-auto px-3">
          {sidebarTab === "files" && (
            <div>
              <p className="px-1 pb-1.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                Project Files
              </p>
              {files.length > 0 ? (
                <div className="text-xs text-[#9BA7B4] space-y-0.5">
                  {renderFileList(files, 0)}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderTree className="w-6 h-6 text-[#6B7280] mx-auto mb-2" />
                  <p className="text-xs text-[#6B7280]">
                    Generate something to see files
                  </p>
                </div>
              )}
            </div>
          )}
          {sidebarTab === "chat" && (
            <div>
              <p className="px-1 pb-1.5 text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                Conversation
              </p>
              <div className="text-xs text-[#6B7280] text-center py-8">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-white/5">
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback className="bg-[#1F2937] text-[#9BA7B4]">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#E6EDF3] truncate">
                {user?.email?.split("@")[0] || "Guest"}
              </p>
              <p className="text-[11px] text-[#6B7280] truncate">
                {user?.email || "guest@v03.tech"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== Main Content (Chat) ===== */}
      <main className="ml-[260px] mr-[500px] flex-1 flex flex-col min-w-0 relative z-[1]">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-3 max-w-md">
                <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center mx-auto">
                  <Code2 className="w-6 h-6 text-[#3B82F6]" />
                </div>
                <h2 className="text-base font-semibold text-[#E6EDF3]">Start building</h2>
                <p className="text-sm text-[#6B7280]">
                  Describe the app you want to build or pick a framework to get started.
                </p>
                <Badge className="bg-[#111827] text-[#6B7280] border-0 text-xs">
                  Using {framework}
                </Badge>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === "user"
                    ? "bg-[#3B82F6]/10 text-[#E6EDF3] border border-white/5"
                    : msg.role === "system"
                    ? "bg-[#22C55E]/5 text-[#D1D5DB] border border-white/5"
                    : "bg-transparent text-[#D1D5DB]"
                }`}
              >
                {msg.role === "assistant" && (
                  <p className="text-[13px] font-semibold text-[#3B82F6] mb-2">manus</p>
                )}
                {msg.content}
                {msg.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-[#3B82F6] ml-0.5 animate-pulse rounded-sm" />
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Prompt input */}
        <div className="px-4 pb-4 pt-2">
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 bg-[#0F141A] border border-white/5 rounded-xl px-4 py-3 focus-within:border-[#3B82F6]/30 transition-colors"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the app you want to build..."
              disabled={isGenerating}
              rows={1}
              className="flex-1 bg-transparent text-sm text-[#E6EDF3] placeholder:text-[#6B7280] resize-none outline-none font-body leading-5 max-h-32"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 128) + "px";
              }}
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              className="w-8 h-8 rounded-lg bg-[#3B82F6] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2563EB] transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* ===== Code Panel (500px fixed) ===== */}
      <aside className="fixed right-0 top-0 h-full w-[500px] bg-[#020617] border-l border-white/5 flex flex-col z-10">
        {/* Panel header */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#3B82F6]/10 flex items-center justify-center">
                <Code2 className="w-3.5 h-3.5 text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#E6EDF3]">Code</p>
                <p className="text-[11px] text-[#6B7280]">
                  {activeFilePath
                    ? activeFilePath
                    : "No file selected"}
                </p>
              </div>
            </div>
            {activeFileContent && (
              <Badge className="text-[10px] px-1.5 py-0 bg-[#111827] text-[#6B7280] border-0">
                <Terminal className="w-3 h-3 mr-0.5" />
                {activeFilePath?.split(".").pop()?.toUpperCase() || "CODE"}
              </Badge>
            )}
          </div>
        </div>

        {/* Code editor */}
        <div className="flex-1 overflow-hidden">
          {activeFileContent ? (
            <WorkspaceLayout />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <Code2 className="w-8 h-8 text-[#6B7280] mx-auto" />
                <p className="text-xs text-[#6B7280]">
                  Select a file or generate code to see it here
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Status footer */}
        <div className="px-4 py-2.5 border-t border-white/5 text-xs text-[#22C55E] flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          {isGenerating ? "Generating..." : activeFileContent ? "Ready" : "Waiting for input"}
        </div>
      </aside>
    </div>
  );
}

// Render file tree items
function renderFileList(files: any[], depth: number): React.ReactNode {
  return files.map((node: any, i: number) => {
    if (node.type === "directory") {
      return (
        <FileDir key={node.path || i} node={node} depth={depth} />
      );
    }
    return <FileItem key={node.path || i} node={node} depth={depth} />;
  });
}

function FileDir({ node, depth }: { node: any; depth: number }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-2 py-1 rounded-md text-[#9BA7B4] hover:text-[#E6EDF3] hover:bg-[#111827] transition-colors text-left"
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        <span className="text-[10px]">{open ? "▼" : "▶"}</span>
        <span className="text-xs truncate">{node.name}</span>
      </button>
      {open && node.children && (
        <div>{renderFileList(node.children, depth + 1)}</div>
      )}
    </div>
  );
}

function FileItem({ node, depth }: { node: any; depth: number }) {
  const setActiveFile = useWorkspaceStore((s) => s.setActiveFile);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const isActive = activeFilePath === node.path;

  return (
    <button
      onClick={() => setActiveFile(node.path)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 rounded-md text-xs text-left transition-colors ${
        isActive
          ? "bg-[#1F2937] text-[#E6EDF3]"
          : "text-[#6B7280] hover:text-[#9BA7B4] hover:bg-[#111827]"
      }`}
      style={{ paddingLeft: depth * 14 + 8 }}
    >
      <span className="text-[10px] opacity-50">📄</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}
