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

Frontend vars for Supabase Auth:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For the current auth migration:

- frontend uses Supabase Auth for email/password and OAuth
- gateway verifies Supabase access tokens and resolves app RBAC
- Google, GitHub, and Apple redirect back to `/auth/callback`
- email/password signup expects email confirmation to be enabled in Supabase Auth

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

## Auth provider setup for V03

Current V03 auth flow:

- frontend starts auth with `supabase.auth.signInWithOAuth(...)`
- Supabase handles the provider handshake
- Supabase redirects back to `https://v03.tech/auth/callback`
- frontend exchanges the callback for a session
- gateway verifies the Supabase access token and resolves RBAC

Required Supabase Auth URL settings:

- `Site URL`
  - `https://v03.tech`
- `Redirect URLs`
  - `https://v03.tech/auth/callback`
  - `http://localhost:3000/auth/callback`

Required frontend env:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Required backend env:

- `SUPABASE_URL`

### GitHub provider

Supabase’s GitHub provider guide says to create a GitHub OAuth App, use the Supabase callback URL, add the Client ID and Client Secret in Supabase, then call `signInWithOAuth({ provider: 'github' })` from the client ([Supabase GitHub auth docs](https://supabase.com/docs/guides/auth/social-login/auth-github)).

Steps:

1. In Supabase:
   - go to `Authentication`
   - open `Providers`
   - open `GitHub`
   - copy the Supabase callback URL
   - it looks like:
     - `https://<project-ref>.supabase.co/auth/v1/callback`

2. In GitHub:
   - go to `Settings`
   - `Developer settings`
   - `OAuth Apps`
   - `New OAuth App`

3. Enter:
   - `Application name`: `V03`
   - `Homepage URL`: `https://v03.tech`
   - `Authorization callback URL`: the exact callback copied from Supabase
   - leave `Enable Device Flow` unchecked

4. After creating the app:
   - copy `Client ID`
   - generate and copy `Client Secret`

5. Back in Supabase:
   - enable `GitHub`
   - paste `Client ID`
   - paste `Client Secret`
   - save

6. Test:
   - open `https://v03.tech`
   - click `Continue with GitHub`
   - finish auth
   - you should return to `/auth/callback`
   - then redirect to `/dashboard` or `/admin/overview`

Local note:

- if you use Supabase local CLI OAuth later, Supabase documents the local callback as:
  - `http://localhost:54321/auth/v1/callback`

### Apple provider

Supabase’s Apple provider guide says to configure Apple in the Supabase dashboard, use the OAuth web flow for browser apps, and provide your Apple Services ID plus a generated secret in Supabase ([Supabase Apple auth docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)).

Important Apple constraints from Supabase docs:

- Apple OAuth secrets must be rotated every 6 months
- Apple does not reliably provide full name in the OAuth flow
- for V03 web auth, use the OAuth flow, not Apple JS

What you need in Apple Developer:

1. An active Apple Developer account
2. A `Services ID`
   - this acts as the Apple client ID for web OAuth
3. A `Sign in with Apple` enabled identifier setup
4. A signing key (`.p8`)
   - used to generate the Apple client secret

Recommended identifiers:

- App or primary identifier:
  - something like `tech.v03.app`
- Services ID:
  - something like `tech.v03.web`

Steps:

1. In Supabase:
   - go to `Authentication`
   - `Providers`
   - open `Apple`
   - review the provider fields you need to fill

2. In Apple Developer:
   - go to `Certificates, Identifiers & Profiles`
   - create or confirm an `App ID`
   - enable `Sign in with Apple`

3. Create a `Services ID`:
   - use a reverse-domain identifier for the website auth client
   - example: `tech.v03.web`

4. Configure the `Services ID` web auth settings:
   - add your website/domain for V03
   - use the exact Supabase callback URL as the return/callback URL
   - this should still be:
     - `https://<project-ref>.supabase.co/auth/v1/callback`

5. Create a `Sign in with Apple` key:
   - download the `.p8` file once
   - store it securely
   - note the `Key ID`
   - note your `Team ID`

6. Generate the Apple client secret
   - Supabase provides an in-dashboard helper/tool reference for generating it
   - you will need:
     - `Team ID`
     - `Key ID`
     - `Services ID`
     - `.p8` private key

7. Back in Supabase:
   - enable `Apple`
   - set `Client ID` to your Apple `Services ID`
   - set `Secret` to the generated Apple client secret
   - save

8. Test:
   - open `https://v03.tech`
   - click `Continue with Apple`
   - finish auth
   - return to `/auth/callback`
   - then redirect into the app

Apple maintenance requirement:

- set a calendar reminder every 6 months to rotate the Apple secret

### Email/password confirmation

Supabase documents that `Confirm Email` is controlled in Auth configuration and should stay enabled if users must verify email before first sign-in ([Supabase general auth configuration docs](https://supabase.com/docs/guides/auth/general-configuration)).

For V03:

- keep `Confirm Email` enabled
- keep `Allow new users to sign up` enabled
- email/password auth is ready in code
- public confirmation email delivery still depends on your final mail setup in Supabase Auth
