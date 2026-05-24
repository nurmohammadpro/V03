# Template Manifest (`template.json`)

Each template version directory (e.g. `templates/nextjs-app-router/v1/`) can include a `template.json` file.

This file is used by the gateway to:
- set project runtime metadata consistently
- validate template versions
- support future migrations

## Shape

```json
{
  "key": "nextjs-app-router",
  "version": "1",
  "label": "Next.js App Router",
  "frameworkKind": "nextjs",
  "runtimeKind": "node",
  "internalPort": 3000,
  "healthcheckPath": "/",
  "commands": {
    "install": "npm ci",
    "build": "npm run build",
    "start": "npm start",
    "dev": "npm run dev -- --host 0.0.0.0 --port 3000"
  }
}
```

## Notes
- `commands.install` is executed inside the runner container.
- `internalPort` is the port exposed by the container and proxied by the gateway.
- For production-grade templates, the template directory should already contain a runnable scaffold (no network downloads required).

