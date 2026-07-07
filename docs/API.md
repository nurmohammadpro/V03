# V03.tech API Documentation

Complete API reference for the V03.tech gateway server.

## Base URL

```
https://v03.tech/api
```

Development:
```
http://localhost:3001/api
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All responses follow this format:

### Success Response (2xx)
```json
{
  "data": {},
  "status": "success",
  "timestamp": "2024-07-08T12:00:00Z"
}
```

### Error Response (4xx/5xx)
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {},
  "requestId": "req-123456",
  "timestamp": "2024-07-08T12:00:00Z"
}
```

## Health Check Endpoints

### Get Basic Health Status
```
GET /health
```

Returns basic server status.

**Response:**
```json
{
  "status": "ok",
  "service": "v03-gateway",
  "version": "1.0.0",
  "timestamp": "2024-07-08T12:00:00Z",
  "uptime": 3600
}
```

### Get Detailed Health Status
```
GET /health/detailed
```

Returns detailed health including database and memory status.

**Response:**
```json
{
  "status": "healthy",
  "service": "v03-gateway",
  "version": "1.0.0",
  "timestamp": "2024-07-08T12:00:00Z",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "database": true,
    "memory": {
      "heapUsed": 128,
      "heapTotal": 256,
      "external": 12,
      "rss": 300
    },
    "poolStats": {
      "totalConnections": 20,
      "idleConnections": 15,
      "waitingRequests": 0
    }
  }
}
```

### Get Readiness Status
```
GET /health/ready
```

For Kubernetes readiness probes. Returns 200 only when service is ready.

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2024-07-08T12:00:00Z"
}
```

### Get Liveness Status
```
GET /health/alive
```

For Kubernetes liveness probes. Returns 200 if process is alive.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-07-08T12:00:00Z"
}
```

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

## Rate Limiting

Global rate limits:
- **300 requests per minute** per IP address

Headers in response:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1625675400
```

## Pagination

List endpoints support pagination via query parameters:

```
GET /resource?page=1&limit=50&sort=-created_at
```

**Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 100)
- `sort` (string): Sort field with optional `-` prefix for descending

**Response includes:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "pages": 20
  }
}
```

## Common Query Parameters

### Filtering
```
GET /resource?status=active&type=generation
```

### Date Range
```
GET /resource?from=2024-01-01&to=2024-12-31
```

### Search
```
GET /resource?search=query
```

## CORS Policy

Allowed origins in production:
- `https://v03.tech`

Development:
- `http://localhost:5173`
- `http://localhost:4173`

Custom origins can be set via `CORS_ORIGIN` environment variable.

## Security Headers

All responses include:

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Request Validation

Request bodies are validated using Zod schemas. Invalid requests return:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    {
      "path": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```

## Webhook Events

Webhooks can be configured for:
- `project.created`
- `project.updated`
- `generation.completed`
- `generation.failed`
- `build.succeeded`
- `build.failed`

**Webhook Payload:**
```json
{
  "event": "project.created",
  "timestamp": "2024-07-08T12:00:00Z",
  "data": {},
  "signature": "sha256=..."
}
```

Verify webhook signature:
```typescript
import crypto from 'crypto';

const signature = req.headers['x-webhook-signature'];
const payload = JSON.stringify(req.body);
const secret = process.env.WEBHOOK_SECRET;

const hash = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

const valid = hash === signature;
```

## Rate Limiting Strategy

- Per-IP rate limiting: 300 requests/min
- Per-user rate limiting (authenticated): 1000 requests/min
- Per-endpoint rate limiting (some endpoints have lower limits)

When rate limited, retry after seconds specified in `Retry-After` header.

## Versioning

The API doesn't use versioning in URLs. Breaking changes:
- Will be announced 30 days in advance
- Old endpoints will remain supported for 90 days
- Changes documented in CHANGELOG.md

## SDKs

Official SDKs available:
- JavaScript/TypeScript: `@v03/sdk`
- Python: `v03-sdk`

## Support

For API issues:
- Documentation: https://docs.v03.tech
- Issues: https://github.com/nurmohammadpro/V03/issues
- Email: support@v03.tech
