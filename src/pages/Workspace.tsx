import { useState, useRef, useEffect, useCallback } from "react";
import WorkspaceLayout from "../components/workspace/WorkspaceLayout";
import { useWorkspaceStore } from "../stores/workspaceStore";
import {
  connectSSE,
  createChatMessage,
  getChatSSEUrl,
  type ChatMessage,
} from "../lib/sse";

const FRAMEWORKS = ["Next.js", "MERN", "Laravel", "Django", "NestJS"];

// Mock responses for when backend is unavailable
const MOCK_RESPONSES: Record<
  string,
  { text: string; files: any[] }
> = {
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
      { name: "routes", path: "routes", type: "directory", children: [
        { name: "web.php", path: "routes/web.php", type: "file", content: "<?php\nuse Illuminate\\Support\\Facades\\Route;\nRoute::get(\"/\", [App\\Http\\Controllers\\HomeController::class, \"index\"]);", language: "php" },
      ]},
    ],
  },
  "Django": {
    text: "Creating a Django project with DRF, PostgreSQL, and JWT auth...\n\nSetting up Django project...\nCreating apps and models...\nConfiguring API endpoints...\nDone! Django project is ready.",
    files: [
      { name: "config", path: "config", type: "directory", children: [
        { name: "settings.py", path: "config/settings.py", type: "file", content: "INSTALLED_APPS = [\"django.contrib.admin\", \"django.contrib.auth\", \"rest_framework\"]", language: "py" },
        { name: "urls.py", path: "config/urls.py", type: "file", content: "from django.urls import path, include\nurlpatterns = [path(\"api/\", include(\"core.urls\"))]", language: "py" },
      ]},
      { name: "core", path: "core", type: "directory", children: [
        { name: "models.py", path: "core/models.py", type: "file", content: "from django.db import models\nclass Item(models.Model):\n    name = models.CharField(max_length=100)\n    created_at = models.DateTimeField(auto_now_add=True)", language: "py" },
        { name: "views.py", path: "core/views.py", type: "file", content: "from rest_framework.views import APIView\nfrom rest_framework.response import Response\nclass HomeView(APIView):\n    def get(self, request):\n        return Response({\"message\": \"Hello V03\"})", language: "py" },
        { name: "urls.py", path: "core/urls.py", type: "file", content: "from django.urls import path\nfrom .views import HomeView\nurlpatterns = [path(\"\", HomeView.as_view())]", language: "py" },
      ]},
    ],
  },
  "NestJS": {
    text: "Generating a NestJS application with TypeScript, Prisma, and Swagger docs...\n\nScaffolding NestJS modules...\nSetting up Prisma schema...\nCreating REST endpoints...\nDone! NestJS project generated.",
    files: [
      { name: "src", path: "src", type: "directory", children: [
        { name: "main.ts", path: "src/main.ts", type: "file", content: "import { NestFactory } from \"@nestjs/core\";\nimport { AppModule } from \"./app.module\";\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  await app.listen(3000);\n}\nbootstrap();", language: "ts" },
        { name: "app.module.ts", path: "src/app.module.ts", type: "file", content: "import { Module } from \"@nestjs/common\";\nimport { AppController } from \"./app.controller\";\n@Module({ controllers: [AppController] })\nexport class AppModule {}", language: "ts" },
        { name: "app.controller.ts", path: "src/app.controller.ts", type: "file", content: "import { Controller, Get } from \"@nestjs/common\";\n@Controller()\nexport class AppController {\n  @Get()\n  getHello(): string { return \"Hello V03\"; }\n}", language: "ts" },
      ]},
      { name: "prisma", path: "prisma", type: "directory", children: [
        { name: "schema.prisma", path: "prisma/schema.prisma", type: "file", content: "datasource db {\n  provider = \"postgresql\"\n  url = env(\"DATABASE_URL\")\n}\nmodel User {\n  id    Int     @id @default(autoincrement())\n  email String  @unique\n  name  String?\n}", language: "prisma" },
      ]},
    ],
  },
};

function buildFileNodes(tree: any[]): any[] {
  return tree.map((item: any) => ({
    name: item.name,
    path: item.path,
    type: item.type,
    content: item.content,
    language: item.language,
    children: item.children ? buildFileNodes(item.children) : undefined,
  }));
}

export default function Workspace() {
  const [input, setInput] = useState("");
  const [framework, setFramework] = useState("Next.js");
  const [showFrameworkPicker, setShowFrameworkPicker] = useState(false);

  const messages = useWorkspaceStore((s) => s.messages);
  const isGenerating = useWorkspaceStore((s) => s.isGenerating);
  const addMessage = useWorkspaceStore((s) => s.addMessage);
  const appendToLastAssistantMessage = useWorkspaceStore(
    (s) => s.appendToLastAssistantMessage
  );
  const updateLastAssistantMessage = useWorkspaceStore(
    (s) => s.updateLastAssistantMessage
  );
  const setFiles = useWorkspaceStore((s) => s.setFiles);
  const setIsGenerating = useWorkspaceStore((s) => s.setIsGenerating);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating) return;

      const userMsg = createChatMessage("user", content);
      addMessage(userMsg);

      const assistantMsg = createChatMessage("assistant", "");
      addMessage(assistantMsg);
      setIsGenerating(true);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: content,
            framework,
            projectId: "new",
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("Backend unavailable");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text_delta") {
                  appendToLastAssistantMessage(data.text ?? "");
                } else if (data.type === "workspace_ready") {
                  if (data.files) {
                    setFiles(buildFileNodes(data.files));
                  }
                } else if (data.type === "done") {
                  updateLastAssistantMessage(
                    data.text ?? "Generation complete."
                  );
                  if (data.files) {
                    setFiles(buildFileNodes(data.files));
                  }
                }
              } catch {
                // ignore parse errors
              }
            }
          }
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
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-white">v03.tech</h1>
          <span className="text-muted-foreground text-xs">Workspace</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFrameworkPicker(!showFrameworkPicker)}
            className="bg-surface border border-border text-foreground px-3.5 py-1.5 rounded-md cursor-pointer text-[13px] font-medium hover:bg-surface-hover transition-colors"
          >
            {framework} ▼
          </button>
          {showFrameworkPicker && (
            <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg overflow-hidden z-[100] min-w-[140px] shadow-[var(--shadow-md)]">
              {FRAMEWORKS.map((fw) => (
                <div
                  key={fw}
                  onClick={() => {
                    setFramework(fw);
                    setShowFrameworkPicker(false);
                  }}
                  className="px-4 py-2 cursor-pointer text-[13px] transition-colors"
                  style={{
                    color: fw === framework ? "var(--primary-foreground)" : undefined,
                    background: fw === framework ? "var(--surface-active)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (fw !== framework) e.currentTarget.style.background = "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (fw !== framework) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {fw}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat pane */}
        <div className="w-1/2 flex flex-col border-r border-border">
          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center flex-col gap-2">
                <div className="text-[32px] opacity-30">⚡</div>
                <div>Describe the app you want to build.</div>
                <div className="text-xs text-muted-foreground">
                  Using {framework}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words"
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  background:
                    msg.role === "user"
                      ? "var(--surface-active)"
                      : msg.role === "system"
                      ? "oklch(0.12 0.04 150)" // green-tinted for system messages
                      : "var(--surface)",
                  color:
                    msg.role === "user"
                      ? "var(--primary-foreground)"
                      : "var(--foreground)",
                  border:
                    msg.role === "assistant"
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                {msg.content}
                {msg.isStreaming && (
                  <span
                    className="inline-block w-2 h-3.5 bg-muted-foreground ml-0.5 animate-pulse"
                  />
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt bar */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-border flex gap-2 bg-card"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the app you want to build..."
              disabled={isGenerating}
              rows={2}
              className="flex-1 bg-surface border border-border rounded-lg text-foreground px-3.5 py-2.5 text-sm resize-none outline-none font-[inherit] placeholder:text-muted-foreground focus:border-ring transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              className="bg-primary border-0 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold self-end transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
            >
              {isGenerating ? "..." : "→"}
            </button>
          </form>
        </div>

        {/* Right: Code workspace */}
        <div className="flex-1 flex flex-col">
          <WorkspaceLayout />
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
