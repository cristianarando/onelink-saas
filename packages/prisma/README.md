# 🗄️ Database Layer (`@repo/prisma`)

> PostgreSQL 16 + TimescaleDB 2.17+ schema, migrations, seeders, and generated Prisma client.

---

## ⚡ Specifications

- **ORM**: [Prisma 7.10](https://www.prisma.io/) with `@prisma/adapter-pg` driver adapter & `prisma.config.ts`
- **Database**: PostgreSQL 16 with TimescaleDB extension enabled
- **Local Container**: `timescale/timescaledb:latest-pg16` on port `5432`
- **Environment**: Automatically reads root `.env` via `dotenv` / `prisma.config.ts`

---

## 🛠️ Database Management Commands

Run from monorepo root:
```bash
# Push schema directly to database (ideal for rapid development)
pnpm db:push

# Seed database with 8 WCAG AAA preset themes, plans, and demo accounts
pnpm db:seed

# Open Prisma Studio web GUI (http://localhost:5555)
pnpm db:studio

# Re-generate Prisma Client after modifying schema.prisma
pnpm db:generate
```

Or from inside `packages/prisma`:
```bash
pnpm db:push
pnpm db:seed
pnpm db:studio
pnpm generate
```

---

## 📊 Relational Models Overview

| Model | Table | Description |
|---|---|---|
| `User` | `users` | Accounts, credentials (`bcrypt` or Google OAuth ID), global roles (`OWNER`, `SUPER_ADMIN`, `CREATOR`) |
| `Profile` | `profiles` | Vanity page (`username`, `title`, `bio`, `avatarUrl`, `isPublished`, SEO & indexing) |
| `Link` | `links` | Blocks on profile (`LINK`, `HEADER`, `DIVIDER`, `DONATION`, `NOTE`, PIN/age gating, scheduling) |
| `Theme` | `themes` | 8 calibrated WCAG AAA preset styling configurations |
| `CustomTheme` | `custom_themes` | Custom CSS & geometry tokens for Creator Pro/Enterprise |
| `SocialLink` | `social_links` | Social icon shortcuts (Instagram, TikTok, YouTube, GitHub, etc.) |
| `Plan` / `Subscription` | `plans`, `subscriptions` | SaaS tiers (`FREE`, `PRO`, `ENTERPRISE`) & active Stripe/simulated subscriptions |
| `TeamMember` / `TeamInvitation` | `team_members`, `team_invitations` | Multi-tenant workspace collaborator seats & cryptographic invitations |
| `BillingEvent` | `billing_events` | Stripe invoicing & webhook event ledger |
| `SecurityFlag` / `DomainBlocklist` / `AdminAuditLog` | `security_flags`, `domain_blocklist`, `admin_audit_logs` | Sentinel AI threat moderation queue, global domain blocklist & immutable audit logs |
| `PageView` / `ClickEvent` | `page_views`, `click_events` | Time-series telemetry for profile visits & link clicks |

For the complete **Mermaid ERD** and Data Dictionary:
👉 [`docs/architecture/database-design.md`](../../docs/architecture/database-design.md)
