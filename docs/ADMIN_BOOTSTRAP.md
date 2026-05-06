# Admin Bootstrap

## Goal

Bring a fresh environment to a usable admin state with:

- roles
- permissions
- role-permission mappings
- plans
- plan features
- market-wise pricing
- AI providers
- AI models
- routing rules
- service integrations

## Required env

- `DATABASE_URL`

Optional:

- `BOOTSTRAP_ADMIN_SYSTEM=true`
- `BOOTSTRAP_SUPER_ADMIN_EMAIL=owner@example.com`

## Commands

From `/Users/nur/Documents/V03/apps/gateway`:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

## Runtime bootstrap

If `BOOTSTRAP_ADMIN_SYSTEM=true` is set, the gateway will run the bootstrap routine at startup.

If `BOOTSTRAP_SUPER_ADMIN_EMAIL` matches an existing user email, that user will be assigned the `super_admin` role automatically.

## Notes

- This bootstrap is idempotent by lookup-and-update behavior.
- It is designed to keep seed defaults aligned with the admin UI and admin API contract.
- It does not replace future billing-provider sync, provider health polling, or live secret resolution.
