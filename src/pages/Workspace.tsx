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

// Convert mock tree to FileNode format
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

  // Auto-scroll
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

      // Try real SSE first, fall back to mock
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

        // Process SSE stream
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
        // Fall back to mock
        console.log("Backend unavailable, using mock response");
        const mock = MOCK_RESPONSES[framework] ?? MOCK_RESPONSES["Next.js"];

        // Simulate streaming
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        background: "#0f0f1a",
        color: "#ccc",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "#151525",
          borderBottom: "1px solid #2a2a3a",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>
            v03.tech
          </h1>
          <span style={{ color: "#666", fontSize: 12 }}>Workspace</span>
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowFrameworkPicker(!showFrameworkPicker)}
            style={{
              background: "#2a2a3a",
              border: "1px solid #3a3a4a",
              color: "#ccc",
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {framework} ▼
          </button>
          {showFrameworkPicker && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                background: "#1a1a2a",
                border: "1px solid #3a3a4a",
                borderRadius: 8,
                overflow: "hidden",
                zIndex: 100,
                minWidth: 140,
              }}
            >
              {FRAMEWORKS.map((fw) => (
                <div
                  key={fw}
                  onClick={() => {
                    setFramework(fw);
                    setShowFrameworkPicker(false);
                  }}
                  style={{
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontSize: 13,
                    color: fw === framework ? "#fff" : "#999",
                    background: fw === framework ? "#2a2a4a" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#222";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      fw === framework ? "#2a2a4a" : "transparent";
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
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: Chat pane */}
        <div
          style={{
            width: "50%",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #2a2a3a",
          }}
        >
          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#555",
                  fontSize: 14,
                  textAlign: "center",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 32, opacity: 0.3 }}>⚡</div>
                <div>
                  Describe the app you want to build.
                </div>
                <div style={{ fontSize: 12, color: "#444" }}>
                  Using {framework}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  maxWidth: "85%",
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  background:
                    msg.role === "user"
                      ? "#2a2a4a"
                      : msg.role === "system"
                      ? "#1a2a1a"
                      : "#1a1a2a",
                  color: msg.role === "user" ? "#e0e0ff" : "#ccc",
                  border:
                    msg.role === "assistant"
                      ? "1px solid #2a2a3a"
                      : "none",
                }}
              >
                {msg.content}
                {msg.isStreaming && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 14,
                      background: "#888",
                      marginLeft: 2,
                      animation: "blink 1s step-end infinite",
                    }}
                  />
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt bar */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #2a2a3a",
              display: "flex",
              gap: 8,
              background: "#151525",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the app you want to build..."
              disabled={isGenerating}
              rows={2}
              style={{
                flex: 1,
                background: "#1a1a2a",
                border: "1px solid #2a2a3a",
                borderRadius: 8,
                color: "#ccc",
                padding: "10px 14px",
                fontSize: 14,
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
              }}
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
              style={{
                background: isGenerating ? "#333" : "#5555ff",
                border: "none",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: 8,
                cursor: isGenerating ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                alignSelf: "flex-end",
                opacity: isGenerating || !input.trim() ? 0.5 : 1,
              }}
            >
              {isGenerating ? "..." : "→"}
            </button>
          </form>
        </div>

        {/* Right: Code workspace */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <WorkspaceLayout />
        </div>
      </div>

      {/* Blink keyframe */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
