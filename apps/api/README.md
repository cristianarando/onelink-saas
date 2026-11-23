# 🚀 Backend API (`apps/api`)

> NestJS 12 REST API powering the Link-in-Bio platform, built with SWC compiler, Swagger OpenAPI documentation, and clean Hexagonal Architecture.

---

## ⚡ Specifications

- **Framework**: [NestJS 12.0+](https://nestjs.com/)
- **Compiler**: SWC (`@swc/core` via `nest-cli.json`, compiles in ~70ms)
- **Module System**: CommonJS with TypeScript `nodenext` type checking
- **Port**: `3001` (Global prefix `/api`)
- **Documentation**: Swagger OpenAPI 3.0 at `/api/docs`
- **Database**: Integrated `@repo/prisma` (`PrismaService` global module)
- **Caching**: Integrated `RedisService` (`CacheModule` global module)

---

## 🛠️ Local Development Commands

Run from monorepo root:
```bash
# Start API in development mode (hot-reload via SWC)
pnpm dev:api

# Run unit tests
pnpm --filter api test

# Run tests in watch mode
pnpm --filter api test:watch

# Build production bundle
pnpm --filter api build

# Start production server
pnpm --filter api start:prod
```

Or from inside `apps/api`:
```bash
pnpm dev
pnpm test
pnpm build
```

---

## 🌐 Endpoints & API Documentation

- **Base URL**: `http://localhost:3001/api`
- **Interactive Swagger Docs**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Health Check**: `GET http://localhost:3001/api/health` -> returns service status, timestamp, and uptime

### Core Domains & Modules
| Domain | Path Prefix | Description |
|---|---|---|
| **Health** | `/api/health` | Service readiness & uptime check for Render/Docker orchestrators |
| **Auth** | `/api/auth` | JWT registration, login, session lookup, Google OAuth 2.0 callback & dev simulation |
| **Profile** | `/api/profiles` | Public vanity profile lookup (`/:username` with Redis cache-aside), `/me`, custom themes & social links |
| **Links** | `/api/links` | Link/Header/Divider/Donation/Note CRUD, PIN unlock, atomic reordering & Sentinel AI checks |
| **Themes** | `/api/themes` | 8 calibrated WCAG AAA preset themes retrieval |
| **Analytics**| `/api/track`, `/api/analytics` | Non-blocking click/view beacons with SHA-256 IP hashing & TimescaleDB aggregations |
| **Sentinel AI**| `/api/sentinel`, `/api/admin/security` | In-process ONNX URL evaluation (`<18ms`), threat queue, user suspension & domain blocklist |
| **Billing & Teams**| `/api/billing` | Stripe Checkout & Portal sessions, webhooks, PDF invoices & multi-tenant team RBAC |

---

## ⚙️ Environment Configuration

The API reads environment variables from the monorepo root `.env` (see `.env.example` for the full list):

```env
PORT=3001
NODE_ENV=development

DATABASE_URL="postgresql://dev_user:dev_password@localhost:5432/linktree_dev?schema=public"
REDIS_URL="redis://localhost:6379"

JWT_SECRET="development_jwt_secret_change_in_production_min_32_chars"
JWT_EXPIRES_IN="30d"
JWT_REFRESH_SECRET="development_jwt_refresh_secret_change_in_production"
JWT_REFRESH_EXPIRES_IN="7d"

NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
```
