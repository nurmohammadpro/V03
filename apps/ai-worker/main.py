"""AI Worker - FastAPI server for code generation (mock mode for now)"""
import json
import os
import uuid
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

app = FastAPI(title="v03 AI Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRAMEWORK_TEMPLATES = {
    "Next.js": {
        "text": "Generating a Next.js project with App Router, TypeScript, Tailwind CSS, and Prisma... Done!",
        "files": [
            {"name": "src", "path": "src", "type": "directory", "children": [
                {"name": "app", "path": "src/app", "type": "directory", "children": [
                    {"name": "layout.tsx", "path": "src/app/layout.tsx", "type": "file", "content": "export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>{children}</body>\n    </html>\n  );\n}", "language": "tsx"},
                    {"name": "page.tsx", "path": "src/app/page.tsx", "type": "file", "content": "export default function Home() {\n  return <h1>Hello V03</h1>;\n}", "language": "tsx"},
                ]},
                {"name": "components", "path": "src/components", "type": "directory", "children": [
                    {"name": "Header.tsx", "path": "src/components/Header.tsx", "type": "file", "content": "export default function Header() {\n  return <header>V03 App</header>;\n}", "language": "tsx"},
                ]},
            ]},
            {"name": "package.json", "path": "package.json", "type": "file", "content": json.dumps({"name": "v03-nextjs", "version": "1.0.0", "scripts": {"dev": "next dev", "build": "next build"}}, indent=2), "language": "json"},
            {"name": "tsconfig.json", "path": "tsconfig.json", "type": "file", "content": json.dumps({"compilerOptions": {"target": "es2017", "lib": ["dom", "dom.iterable", "esnext"], "module": "esnext", "strict": True}}, indent=2), "language": "json"},
        ],
    },
    "MERN": {
        "text": "Building a MERN stack app with Express, React, MongoDB, and Node.js... Done!",
        "files": [
            {"name": "server", "path": "server", "type": "directory", "children": [
                {"name": "index.js", "path": "server/index.js", "type": "file", "content": 'const express = require("express");\nconst app = express();\napp.use(express.json());\napp.listen(5000, () => console.log("Server running"));', "language": "js"},
                {"name": "models", "path": "server/models", "type": "directory", "children": [
                    {"name": "User.js", "path": "server/models/User.js", "type": "file", "content": 'const mongoose = require("mongoose");\nconst userSchema = new mongoose.Schema({ name: String, email: String });\nmodule.exports = mongoose.model("User", userSchema);', "language": "js"},
                ]},
            ]},
            {"name": "client", "path": "client", "type": "directory", "children": [
                {"name": "src", "path": "client/src", "type": "directory", "children": [
                    {"name": "App.jsx", "path": "client/src/App.jsx", "type": "file", "content": "function App() { return <h1>MERN App</h1>; }\nexport default App;", "language": "jsx"},
                ]},
            ]},
        ],
    },
    "Laravel": {
        "text": "Scaffolding a Laravel application with Blade views, Eloquent ORM, and Sanctum auth... Done!",
        "files": [
            {"name": "app", "path": "app", "type": "directory", "children": [
                {"name": "Models", "path": "app/Models", "type": "directory", "children": [
                    {"name": "User.php", "path": "app/Models/User.php", "type": "file", "content": "<?php\nnamespace App\\Models;\nuse Illuminate\\Database\\Eloquent\\Model;\nclass User extends Model { protected $fillable = [\"name\", \"email\"]; }", "language": "php"},
                ]},
                {"name": "Http", "path": "app/Http", "type": "directory", "children": [
                    {"name": "Controllers", "path": "app/Http/Controllers", "type": "directory", "children": [
                        {"name": "HomeController.php", "path": "app/Http/Controllers/HomeController.php", "type": "file", "content": "<?php\nnamespace App\\Http\\Controllers;\nclass HomeController extends Controller { public function index() { return view(\"welcome\"); } }", "language": "php"},
                    ]},
                ]},
            ]},
            {"name": "routes", "path": "routes", "type": "directory", "children": [
                {"name": "web.php", "path": "routes/web.php", "type": "file", "content": "<?php\nuse Illuminate\\Support\\Facades\\Route;\nRoute::get(\"/\", [App\\Http\\Controllers\\HomeController::class, \"index\"]);", "language": "php"},
            ]},
        ],
    },
    "Django": {
        "text": "Creating a Django project with DRF, PostgreSQL, and JWT auth... Done!",
        "files": [
            {"name": "config", "path": "config", "type": "directory", "children": [
                {"name": "settings.py", "path": "config/settings.py", "type": "file", "content": 'INSTALLED_APPS = ["django.contrib.admin", "django.contrib.auth", "rest_framework"]', "language": "py"},
                {"name": "urls.py", "path": "config/urls.py", "type": "file", "content": 'from django.urls import path, include\nurlpatterns = [path("api/", include("core.urls"))]', "language": "py"},
            ]},
            {"name": "core", "path": "core", "type": "directory", "children": [
                {"name": "models.py", "path": "core/models.py", "type": "file", "content": 'from django.db import models\nclass Item(models.Model):\n    name = models.CharField(max_length=100)\n    created_at = models.DateTimeField(auto_now_add=True)', "language": "py"},
                {"name": "views.py", "path": "core/views.py", "type": "file", "content": 'from rest_framework.views import APIView\nfrom rest_framework.response import Response\nclass HomeView(APIView):\n    def get(self, request):\n        return Response({"message": "Hello V03"})', "language": "py"},
                {"name": "urls.py", "path": "core/urls.py", "type": "file", "content": 'from django.urls import path\nfrom .views import HomeView\nurlpatterns = [path("", HomeView.as_view())]', "language": "py"},
            ]},
        ],
    },
    "NestJS": {
        "text": "Generating a NestJS application with TypeScript, Prisma, and Swagger docs... Done!",
        "files": [
            {"name": "src", "path": "src", "type": "directory", "children": [
                {"name": "main.ts", "path": "src/main.ts", "type": "file", "content": 'import { NestFactory } from "@nestjs/core";\nimport { AppModule } from "./app.module";\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  await app.listen(3000);\n}\nbootstrap();', "language": "ts"},
                {"name": "app.module.ts", "path": "src/app.module.ts", "type": "file", "content": 'import { Module } from "@nestjs/common";\nimport { AppController } from "./app.controller";\n@Module({ controllers: [AppController] })\nexport class AppModule {}', "language": "ts"},
                {"name": "app.controller.ts", "path": "src/app.controller.ts", "type": "file", "content": 'import { Controller, Get } from "@nestjs/common";\n@Controller()\nexport class AppController {\n  @Get()\n  getHello(): string { return "Hello V03"; }\n}', "language": "ts"},
            ]},
            {"name": "prisma", "path": "prisma", "type": "directory", "children": [
                {"name": "schema.prisma", "path": "prisma/schema.prisma", "type": "file", "content": 'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\nmodel User {\n  id    Int     @id @default(autoincrement())\n  email String  @unique\n  name  String?\n}', "language": "prisma"},
            ]},
        ],
    },
}


class GenerateRequest(BaseModel):
    prompt: str
    framework: str = "Next.js"
    project_id: str | None = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-worker", "version": "1.0.0"}


async def generate_events(req: GenerateRequest) -> AsyncGenerator[dict, None]:
    """SSE event generator for code generation."""
    framework = req.framework
    template = FRAMEWORK_TEMPLATES.get(framework, FRAMEWORK_TEMPLATES["Next.js"])
    text = template["text"]
    files = template["files"]

    yield {"event": "init", "data": json.dumps({"projectId": req.project_id or str(uuid.uuid4()), "framework": framework, "status": "started"})}

    words = text.split(" ")
    for i, word in enumerate(words):
        chunk = word + (" " if i < len(words) - 1 else "")
        yield {"event": "text_delta", "data": json.dumps({"text": chunk})}

    yield {"event": "workspace_ready", "data": json.dumps({"files": files, "framework": framework})}
    yield {"event": "done", "data": json.dumps({"text": text, "files": files, "framework": framework})}


@app.post("/generate")
async def generate(req: GenerateRequest):
    """Generate code via SSE streaming."""
    return EventSourceResponse(generate_events(req))


@app.post("/generate/sync")
async def generate_sync(req: GenerateRequest):
    """Generate code (sync response for non-SSE clients)."""
    template = FRAMEWORK_TEMPLATES.get(req.framework, FRAMEWORK_TEMPLATES["Next.js"])
    return {
        "projectId": req.project_id or str(uuid.uuid4()),
        "framework": req.framework,
        "text": template["text"],
        "files": template["files"],
        "status": "complete",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
