# Supabase Setup

## Recommended role of Supabase in this repo

Use Supabase as:

- managed Postgres
- optional storage later
- optional auth later

Do not move admin business logic into the browser. Keep:

- admin mutations
- RBAC enforcement
- subscription logic
- AI provider routing
- audit logging

inside the gateway.

## Environment variables

Use [apps/gateway/.env.example](/Users/nur/Documents/V03/apps/gateway/.env.example:1) as the template.

Core variables:

- `DATABASE_RUNTIME_URL`
  - used by the running gateway
  - for Supabase, prefer the `Session Pooler` URL for this persistent backend
- `DATABASE_MIGRATION_URL`
  - used by Drizzle migration and seed tooling
  - prefer the `Direct Connection` URL when your environment supports IPv6
- `DATABASE_DISABLE_PREPARE`
  - set to `true` when using Supabase pooler URLs or port `6543`
- `BOOTSTRAP_ADMIN_SYSTEM`
  - set to `true` if you want the gateway to seed defaults on startup
- `BOOTSTRAP_SUPER_ADMIN_EMAIL`
  - existing user email to auto-assign `super_admin`

Optional Supabase vars for future phases:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Which Supabase connection string to use

Runtime gateway:

- use `Session Pooler` when you need pooled access or IPv4 support

Migration and seed:

- use `Direct Connection` if your environment supports IPv6
- otherwise use `Session Pooler`

Avoid using `Transaction Pooler` for this current persistent gateway.

## Next commands

From `/Users/nur/Documents/V03/apps/gateway`:

```bash
npm run db:push
npm run db:seed
```

If you want automatic seed/bootstrap on app start:

```bash
BOOTSTRAP_ADMIN_SYSTEM=true
BOOTSTRAP_SUPER_ADMIN_EMAIL=owner@example.com
```

## Suggested rollout

1. Create the Supabase project.
2. Copy the session pooler URL into `DATABASE_RUNTIME_URL`.
3. Copy the direct connection URL into `DATABASE_MIGRATION_URL`.
4. Run `npm run db:push`.
5. Run `npm run db:seed`.
6. Sign in once with the owner email.
7. Re-run seed with `BOOTSTRAP_SUPER_ADMIN_EMAIL` set if you want automatic super-admin assignment.
