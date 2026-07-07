"""AI Worker - FastAPI server for code generation (LLM-backed with fallback templates)."""
import json
import os
import uuid
from typing import AsyncGenerator, Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

# Optional: OpenAI SDK
_has_openai = False
try:
    from openai import AsyncOpenAI

    _has_openai = True
except ImportError:
    pass

# Optional: Anthropic SDK
_has_anthropic = False
try:
    from anthropic import AsyncAnthropic

    _has_anthropic = True
except ImportError:
    pass

app = FastAPI(title="v03 AI Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NEXT_FALLBACK_PACKAGE_JSON = json.dumps(
    {
        "name": "v03-nextjs",
        "private": True,
        "version": "1.0.0",
        "scripts": {
            "dev": "next dev -p 3000",
            "build": "next build",
            "start": "next start -p 3000",
        },
        "dependencies": {
            "next": "^15.3.4",
            "react": "^19.0.0",
            "react-dom": "^19.0.0",
            "@prisma/client": "^6.0.0",
        },
        "devDependencies": {
            "@types/node": "^22.0.0",
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
            "autoprefixer": "^10.4.20",
            "postcss": "^8.4.49",
            "prisma": "^6.0.0",
            "tailwindcss": "^3.4.17",
            "typescript": "^5.5.0",
        },
    },
    indent=2,
)

NEXT_FALLBACK_TSCONFIG_JSON = json.dumps(
    {
        "compilerOptions": {
            "target": "es2017",
            "lib": ["dom", "dom.iterable", "esnext"],
            "allowJs": False,
            "skipLibCheck": True,
            "strict": True,
            "forceConsistentCasingInFileNames": True,
            "noEmit": True,
            "esModuleInterop": True,
            "module": "esnext",
            "moduleResolution": "bundler",
            "resolveJsonModule": True,
            "isolatedModules": True,
            "jsx": "preserve",
            "incremental": True,
            "plugins": [{"name": "next"}],
        },
        "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        "exclude": ["node_modules"],
    },
    indent=2,
)

FRAMEWORK_TEMPLATES = {
    "Next.js": {
        "text": "Generating a Next.js project with App Router, TypeScript, Tailwind CSS, and Prisma... Done!",
        "files": [
            {"name": "src", "path": "src", "type": "directory", "children": [
                {"name": "app", "path": "src/app", "type": "directory", "children": [
                    {"name": "layout.tsx", "path": "src/app/layout.tsx", "type": "file", "content": "import './globals.css';\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>{children}</body>\n    </html>\n  );\n}", "language": "tsx"},
                    {"name": "page.tsx", "path": "src/app/page.tsx", "type": "file", "content": "export default function Home() {\n  return (\n    <main className=\"min-h-screen bg-zinc-950 text-zinc-100\">\n      <div className=\"mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-24 text-center\">\n        <p className=\"mb-4 text-sm uppercase tracking-[0.3em] text-emerald-400\">V03 fallback scaffold</p>\n        <h1 className=\"text-4xl font-semibold tracking-tight sm:text-6xl\">Hello V03</h1>\n        <p className=\"mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg\">\n          This fallback project is intentionally minimal, but it is fully bootable inside Docker so preview can still render.\n        </p>\n        <div className=\"mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-sm text-zinc-300 shadow-2xl shadow-black/20\">\n          Next.js • App Router • TypeScript • Tailwind CSS\n        </div>\n      </div>\n    </main>\n  );\n}", "language": "tsx"},
                    {"name": "globals.css", "path": "src/app/globals.css", "type": "file", "content": "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  color-scheme: dark;\n}\n\nhtml,\nbody {\n  margin: 0;\n  min-height: 100%;\n  background: #09090b;\n}\n\n* {\n  box-sizing: border-box;\n}\n", "language": "css"},
                ]},
                {"name": "components", "path": "src/components", "type": "directory", "children": [
                    {"name": "Header.tsx", "path": "src/components/Header.tsx", "type": "file", "content": "export default function Header() {\n  return <header>V03 App</header>;\n}", "language": "tsx"},
                ]},
            ]},
            {"name": "next.config.mjs", "path": "next.config.mjs", "type": "file", "content": "/** @type {import('next').NextConfig} */\nconst nextConfig = {};\n\nexport default nextConfig;\n", "language": "js"},
            {"name": "postcss.config.mjs", "path": "postcss.config.mjs", "type": "file", "content": "export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n", "language": "js"},
            {"name": "tailwind.config.ts", "path": "tailwind.config.ts", "type": "file", "content": "import type { Config } from 'tailwindcss';\n\nconst config: Config = {\n  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n};\n\nexport default config;\n", "language": "ts"},
            {"name": "package.json", "path": "package.json", "type": "file", "content": NEXT_FALLBACK_PACKAGE_JSON, "language": "json"},
            {"name": "tsconfig.json", "path": "tsconfig.json", "type": "file", "content": NEXT_FALLBACK_TSCONFIG_JSON, "language": "json"},
            {"name": "next-env.d.ts", "path": "next-env.d.ts", "type": "file", "content": "/// <reference types=\"next\" />\n/// <reference types=\"next/image-types/global\" />\n\n// NOTE: This file should not be edited\n// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.\n", "language": "ts"},
            {"name": "prisma", "path": "prisma", "type": "directory", "children": [
                {"name": "schema.prisma", "path": "prisma/schema.prisma", "type": "file", "content": "generator client {\n  provider = \"prisma-client-js\"\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\nmodel User {\n  id    Int     @id @default(autoincrement())\n  email String  @unique\n  name  String?\n}\n", "language": "prisma"},
            ]},
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

ZAI_BASE_URL = os.getenv("ZAI_BASE_URL", "https://api.z.ai/api/paas/v4").rstrip("/")
ZAI_MODEL = os.getenv("ZAI_MODEL", "glm-4.6")
ZAI_API_KEY = os.getenv("ZAI_API_KEY", "").strip()
AI_ENGINE = os.getenv("AI_ENGINE", "zai").strip().lower()  # gateway | zai | openai | anthropic | mock

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_BASE_URL = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1").rstrip("/")

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:3001").rstrip("/")
INTERNAL_API_TOKEN = os.getenv("INTERNAL_API_TOKEN", "").strip()

@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "v03-ai-worker",
        "version": "1.0.0",
        "ai_engine": AI_ENGINE,
        "zai_model": ZAI_MODEL,
        "zai_base_url": ZAI_BASE_URL,
        "has_openai": bool(OPENAI_API_KEY),
        "has_openai_sdk": _has_openai,
        "openai_model": OPENAI_MODEL,
        "has_anthropic": bool(ANTHROPIC_API_KEY),
        "has_anthropic_sdk": _has_anthropic,
        "anthropic_model": ANTHROPIC_MODEL,
        "gateway_url": GATEWAY_URL,
        "has_zai_api_key": bool(ZAI_API_KEY),
        "has_internal_api_token": bool(INTERNAL_API_TOKEN),
    }


def _extract_json(text: str) -> dict[str, Any] | None:
    """Try to parse a JSON object from a string (best-effort)."""
    text = (text or "").strip()
    if not text:
        return None
    # First try direct JSON.
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Attempt to recover JSON inside code fences or extra text.
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        blob = text[start : end + 1]
        try:
            parsed = json.loads(blob)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return None
    return None


async def call_zai_builder(prompt: str, framework: str) -> dict[str, Any]:
    if not ZAI_API_KEY:
        raise HTTPException(status_code=500, detail="ZAI_API_KEY is not configured on ai-worker")

    system = (
        "You are a senior software engineer inside a web app builder.\n"
        "Return ONLY valid JSON (no markdown) with keys:\n"
        "- text: a short progress + summary string\n"
        "- files: an array of nodes. Node is either:\n"
        "  - {\"type\":\"directory\",\"name\":string,\"path\":string,\"children\":files[]}\n"
        "  - {\"type\":\"file\",\"name\":string,\"path\":string,\"content\":string,\"language\":string}\n"
        "Paths must be POSIX-style and relative (no leading slash)."
    )

    user = (
        f"Framework: {framework}\n"
        f"User request: {prompt}\n\n"
        "Generate a runnable, conventional project scaffold (not pseudo code). "
        "Include package/config files as needed. Keep it minimal but working."
    )

    payload = {
        "model": ZAI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
    }

    url = f"{ZAI_BASE_URL}/chat/completions"
    headers = {"Authorization": f"Bearer {ZAI_API_KEY}", "Content-Type": "application/json"}
    timeout = httpx.Timeout(90.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Z.ai error {resp.status_code}: {resp.text[:400]}")
        data = resp.json()

    content = (
        (((data.get("choices") or [{}])[0]).get("message") or {}).get("content")
        if isinstance(data, dict)
        else None
    )
    parsed = _extract_json(content or "")
    if not parsed or "files" not in parsed:
        raise HTTPException(status_code=502, detail="Model did not return valid JSON file payload")
    return parsed


async def fetch_provider_from_gateway(provider_key: str) -> dict[str, Any]:
    if not INTERNAL_API_TOKEN:
        raise HTTPException(status_code=500, detail="INTERNAL_API_TOKEN is not configured on ai-worker")

    url = f"{GATEWAY_URL}/api/internal/ai/providers/{provider_key}"
    timeout = httpx.Timeout(20.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url, headers={"x-internal-token": INTERNAL_API_TOKEN})
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Gateway provider lookup failed ({resp.status_code}): {resp.text[:300]}")
        return resp.json()


async def call_openai_compatible_builder(
    *,
    prompt: str,
    framework: str,
    base_url: str,
    api_key: str,
    model: str,
    chat_path: str,
) -> dict[str, Any]:
    system = _build_system_prompt()
    user = _build_user_prompt(prompt, framework)

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
    }

    base_url = (base_url or "").rstrip("/")
    chat_path = (chat_path or "/chat/completions").strip()
    if not chat_path.startswith("/"):
        chat_path = "/" + chat_path
    url = f"{base_url}{chat_path}"

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    timeout = httpx.Timeout(90.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Provider error {resp.status_code}: {resp.text[:400]}")
        data = resp.json()

    content = (
        (((data.get("choices") or [{}])[0]).get("message") or {}).get("content")
        if isinstance(data, dict)
        else None
    )
    parsed = _extract_json(content or "")
    if not parsed or "files" not in parsed:
        raise HTTPException(status_code=502, detail="Model did not return valid JSON file payload")
    return parsed


def _build_system_prompt() -> str:
    return (
        "You are a senior software engineer inside a web app builder.\n"
        "Return ONLY valid JSON (no markdown) with keys:\n"
        "- text: a short progress + summary string\n"
        "- files: an array of nodes. Node is either:\n"
        "  - {\"type\":\"directory\",\"name\":string,\"path\":string,\"children\":files[]}\n"
        "  - {\"type\":\"file\",\"name\":string,\"path\":string,\"content\":string,\"language\":string}\n"
        "Paths must be POSIX-style and relative (no leading slash)."
    )


def _build_user_prompt(prompt: str, framework: str) -> str:
    return (
        f"Framework: {framework}\n"
        f"User request: {prompt}\n\n"
        "Generate a runnable, conventional project scaffold (not pseudo code). "
        "Include package/config files as needed. Keep it minimal but working."
    )


async def call_openai_direct(prompt: str, framework: str) -> dict[str, Any]:
    """Call OpenAI API directly using the official SDK."""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured on ai-worker")
    if not _has_openai:
        raise HTTPException(status_code=500, detail="openai SDK not installed. Run: pip install openai")

    client = AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL if OPENAI_BASE_URL != "https://api.openai.com/v1" else None)

    system = _build_system_prompt()
    user = _build_user_prompt(prompt, framework)

    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
        max_tokens=8192,
    )

    content = response.choices[0].message.content if response.choices else None
    parsed = _extract_json(content or "")
    if not parsed or "files" not in parsed:
        raise HTTPException(status_code=502, detail="OpenAI did not return valid JSON file payload")
    return parsed


async def call_anthropic_direct(prompt: str, framework: str) -> dict[str, Any]:
    """Call Anthropic API directly using the official SDK."""
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY is not configured on ai-worker")
    if not _has_anthropic:
        raise HTTPException(status_code=500, detail="anthropic SDK not installed. Run: pip install anthropic")

    client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    system = _build_system_prompt()
    user = _build_user_prompt(prompt, framework)

    response = await client.messages.create(
        model=ANTHROPIC_MODEL,
        system=system,
        messages=[
            {"role": "user", "content": user},
        ],
        temperature=0.2,
        max_tokens=8192,
    )

    content = ""
    if response.content:
        for block in response.content:
            if hasattr(block, "text"):
                content += block.text

    parsed = _extract_json(content or "")
    if not parsed or "files" not in parsed:
        raise HTTPException(status_code=502, detail="Anthropic did not return valid JSON file payload")
    return parsed


class GenerateRequest(BaseModel):
    prompt: str
    framework: str = "Next.js"
    project_id: str | None = None
    provider_key: str | None = None
    model_key: str | None = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-worker", "version": "1.0.0"}


async def _generate_content(req: GenerateRequest) -> dict[str, Any]:
    """Shared LLM invocation logic used by both streaming and sync endpoints."""
    framework = req.framework
    text = ""
    files: list[dict[str, Any]] = []
    fallback_reason: str | None = None

    if AI_ENGINE == "gateway":
        provider_key = (req.provider_key or "zai").strip()
        try:
            provider_bundle = await fetch_provider_from_gateway(provider_key)
            provider = provider_bundle.get("provider") or {}
            api_key = str(provider_bundle.get("apiKey") or "")
            base_url = str(provider.get("baseUrl") or "")
            chat_path = str(provider.get("chatCompletionsPath") or "/chat/completions")
            model = (req.model_key or provider.get("defaultModelKey") or "").strip()
            if not model:
                raise HTTPException(status_code=500, detail="No model configured for provider")

            result = await call_openai_compatible_builder(
                prompt=req.prompt,
                framework=framework,
                base_url=base_url,
                api_key=api_key,
                model=model,
                chat_path=chat_path,
            )
            text = str(result.get("text") or "Generation complete.")
            files = list(result.get("files") or [])
        except Exception as exc:
            template = FRAMEWORK_TEMPLATES.get(framework, FRAMEWORK_TEMPLATES["Next.js"])
            text = f"{template['text']}\n\n(LLM fallback: {type(exc).__name__})"
            files = template["files"]
            fallback_reason = str(exc)
    elif AI_ENGINE == "zai":
        try:
            result = await call_zai_builder(req.prompt, framework)
            text = str(result.get("text") or "Generation complete.")
            files = list(result.get("files") or [])
        except Exception as exc:
            template = FRAMEWORK_TEMPLATES.get(framework, FRAMEWORK_TEMPLATES["Next.js"])
            text = f"{template['text']}\n\n(LLM fallback: {type(exc).__name__})"
            files = template["files"]
            fallback_reason = str(exc)
    elif AI_ENGINE == "openai":
        try:
            result = await call_openai_direct(req.prompt, framework)
            text = str(result.get("text") or "Generation complete.")
            files = list(result.get("files") or [])
        except Exception as exc:
            template = FRAMEWORK_TEMPLATES.get(framework, FRAMEWORK_TEMPLATES["Next.js"])
            text = f"{template['text']}\n\n(LLM fallback: {type(exc).__name__})"
            files = template["files"]
            fallback_reason = str(exc)
    elif AI_ENGINE == "anthropic":
        try:
            result = await call_anthropic_direct(req.prompt, framework)
            text = str(result.get("text") or "Generation complete.")
            files = list(result.get("files") or [])
        except Exception as exc:
            template = FRAMEWORK_TEMPLATES.get(framework, FRAMEWORK_TEMPLATES["Next.js"])
            text = f"{template['text']}\n\n(LLM fallback: {type(exc).__name__})"
            files = template["files"]
            fallback_reason = str(exc)
    else:
        template = FRAMEWORK_TEMPLATES.get(framework, FRAMEWORK_TEMPLATES["Next.js"])
        text = template["text"]
        files = template["files"]

    return {"text": text, "files": files, "fallback_reason": fallback_reason}


async def generate_events(req: GenerateRequest) -> AsyncGenerator[dict, None]:
    """SSE event generator for code generation."""
    framework = req.framework
    result = await _generate_content(req)
    text = result["text"]
    files = result["files"]

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
    """Generate code (sync response for non-SSE clients). Uses real LLM, not templates."""
    result = await _generate_content(req)
    return {
        "projectId": req.project_id or str(uuid.uuid4()),
        "framework": req.framework,
        "text": result["text"],
        "files": result["files"],
        "status": "complete",
        "fallback": result.get("fallback_reason") is not None,
        "fallback_reason": result.get("fallback_reason"),
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
