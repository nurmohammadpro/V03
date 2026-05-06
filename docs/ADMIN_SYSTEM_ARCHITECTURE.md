# Admin System Architecture

## Phase 1: Domain Contract

The admin system is designed around stable business domains before UI or persistence details:

- Users
  - account status
  - profile review
  - plan changes
  - admin assignment
- Subscriptions
  - plans
  - features
  - market-wise pricing
  - subscription lifecycle
- AI Management
  - providers
  - models
  - routing rules
  - fallback policy
- Other Services
  - storage
  - runtime
  - billing
  - notifications
  - security services
- RBAC
  - roles
  - permissions
  - assignments
  - audit logs

## Phase 2: Admin UI

The admin UI should only render against contract-based view models that already map to the backend domain:

- `UserProfile`
- `SubscriptionPlan`
- `AiProvider`
- `AiRoutingRule`
- `ServiceIntegration`
- `AdminRole`
- `AdminPermission`
- `AdminAuditLog`

This prevents page-local mock structures from drifting away from the API contract.

## Phase 3: API Layer

The gateway exposes admin routes grouped by domain:

- `/api/admin/bootstrap`
- `/api/admin/users`
- `/api/admin/plans`
- `/api/admin/ai/providers`
- `/api/admin/ai/routing-rules`
- `/api/admin/services`
- `/api/admin/rbac/roles`

Mutations require explicit permission keys:

- `users.read`
- `users.write`
- `subscriptions.read`
- `subscriptions.write`
- `ai.read`
- `ai.write`
- `services.read`
- `services.write`
- `rbac.read`
- `rbac.write`

## Phase 4: Persistence and Hardening

The database model is already shaped for future growth:

- `admin_roles`
- `admin_permissions`
- `role_permissions`
- `user_admin_assignments`
- `plans`
- `plan_features`
- `plan_prices`
- `subscriptions`
- `ai_providers`
- `ai_models`
- `ai_routing_rules`
- `service_integrations`
- `admin_audit_logs`

Hardening work after initial integration:

- secret resolution from vault/env provider
- migration generation and seed data
- mutation validation
- optimistic concurrency on critical settings
- webhook synchronization for billing providers
- provider health polling and routing analytics
- admin session/device logging
- bulk admin actions with confirmation rules
