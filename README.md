# 🔗 OneLink — Scalable Link-in-Bio SaaS Platform

[![CI Pipeline](https://github.com/cristianarando/onelink-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/cristianarando/onelink-saas/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/Live_Demo-onelink--saas.vercel.app-000000?style=flat&logo=vercel)](https://onelink-saas.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![NestJS 12](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-In--Process_ML-005CED?logo=onnx)](https://onnxruntime.ai/)

> High-performance, mobile-first **Link-in-Bio SaaS platform** engineered with modern distributed system design, clean modular architecture, TimescaleDB time-series telemetry, Redis cache-aside hot paths, Stripe billing, and in-process ONNX ML threat detection (`<18ms` inference SLA).

> [!TIP]
> ### 🌐 Live Production Demo & Quick Evaluation
> - **Web Application**: [https://onelink-saas.vercel.app](https://onelink-saas.vercel.app)
> - **Sample Public Profile**: [https://onelink-saas.vercel.app/crisarando](https://onelink-saas.vercel.app/crisarando)
> - **Demo Founder Account**: `cris@onelink.bio` / `Password123!` · **Super Admin**: `admin@onelink.bio` / `Password123!`

<img width="1698" height="993" alt="{1F1ED40A-A4D2-4932-8581-A440B4196653}" src="https://github.com/user-attachments/assets/0c696dec-4655-42ce-9ef1-2559f3e39315" />
<img width="1858" height="994" alt="{C62E3677-2F51-467F-9917-528A184D86F3}" src="https://github.com/user-attachments/assets/f07e1cc3-8200-4040-bc2b-b0c5de2da32f" />

---

## ⚡ Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Monorepo Engine** | [Turborepo 2.11+](https://turbo.build/) + [pnpm 12](https://pnpm.io/) | Workspaces, isolated dependencies, cached pipelines |
| **Backend API** | [NestJS 12](https://nestjs.com/) + [SWC Compiler](https://swc.rs/) | Modular Architecture, Swagger OpenAPI 3.0, JWT & Google OAuth 2.0 |
| **Frontend Web** | [Next.js 16.4](https://nextjs.org/) + [React 19](https://react.dev/) | App Router, Server Components, Partial Prerendering & Streaming Suspense |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/turbopack`) | Modern CSS theme engine, calibrated WCAG AAA color tokens |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) + [TimescaleDB](https://www.timescale.com/) | Relational core + time-series tables for telemetry & analytics |
| **Cache & Blocklists** | [Redis 7](https://redis.io/) (`ioredis`) | Profile JSON cache-aside (`<15ms`), `O(1)` domain blocklists & session revocation |
| **ML Threat Defense** | [ONNX Runtime](https://onnxruntime.ai/) (`onnxruntime-node`) | In-process Random Forest URL classifier trained on 235k PhiUSIIL URLs (`<18ms`) |
| **Creator Studio Tools** | Custom QR Studio, OpenGraph Auto-Fill & UTM Builder | Vector SVG/1024px PNG QR export, SSRF-guarded metadata scraping & attribution builder |
| **Data Modeling & Validation** | [Prisma 7.10](https://www.prisma.io/) (`@prisma/adapter-pg`) + [Zod 3.24+](https://zod.dev/) | End-to-end type safety and shared request validation |
| **Billing & Payments** | [Stripe SDK](https://stripe.com/) | Checkout sessions, webhooks, Customer Portal, VAT PDF invoices & dev sandbox |
| **Local Infrastructure** | [Docker Compose](https://www.docker.com/) | Containerized TimescaleDB, Redis, and Mailhog |

---

## 🌐 Services, URLs & Ports

When the local environment is running, services are available at:

| Service | Environment / URL | Description | Default Port |
|---|---|---|---|
| **Web Application** | [http://localhost:3000](http://localhost:3000) | Public profiles (`/@username`) & Creator Studio Dashboard | `3000` |
| **Backend REST API** | [http://localhost:3001/api](http://localhost:3001/api) | NestJS REST API endpoints | `3001` |
| **Swagger OpenAPI Docs** | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) | Interactive API documentation & test console | `3001` |
| **Prisma Studio (GUI)** | [http://localhost:5555](http://localhost:5555) | Web GUI to view/edit database records (`pnpm db:studio`) | `5555` |
| **Mailhog (Email UI)** | [http://localhost:8025](http://localhost:8025) | Local SMTP mailbox testing interface | `8025` |
| **TimescaleDB / Postgres**| `localhost:5432` | Relational & time-series database (`linktree` / `postgres`) | `5432` |
| **Redis Stack** | `localhost:6379` | In-memory key-value cache and message broker | `6379` |

---

## 🚀 Quick Start Guide (From Zero to Running)

Follow these steps to run the complete platform on your local machine:

### 1. Prerequisites
- **Node.js**: `v22+` or `v24+` (Recommended: `v24.11.1`)
- **pnpm**: `v10+` or `v12+` (Recommended: `v12.11.2`)
- **Docker Desktop**: Must be installed and running.

### 2. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/cristianarando/onelink-saas.git
cd onelink-saas

# Install all workspace dependencies
pnpm install
```

### 3. Start Local Infrastructure (Docker)
Start the TimescaleDB, Redis, and Mailhog containers:
```bash
pnpm docker:up
```
> *To check status: `docker ps` or `pnpm docker:logs`*

### 4. Initialize & Seed the Database
Push the schema to PostgreSQL and seed the 8 WCAG AAA themes, subscription plans, and demo accounts:
```bash
# Push schema tables (User, Profile, Link, Theme, Plan, Subscription, SecurityFlag, etc.)
pnpm db:push

# Seed 8 calibrated preset themes, subscription plans, and demo accounts
pnpm db:seed
```

### 5. Launch Development Servers
Start both the NestJS API and Next.js Web applications concurrently:
```bash
pnpm dev
```
- Open [http://localhost:3000](http://localhost:3000) to view the Web application.
- Open [http://localhost:3001/api/docs](http://localhost:3001/api/docs) to view the Swagger API documentation.

---

## 👥 Default Demo Accounts & Test Credentials

All preconfigured accounts seeded via `pnpm db:seed` use the shared password **`Password123!`**:

| Account | Email | Password | Role | Description & Scope |
|---|---|---|---|---|
| **Cristian Arando** | `cris@onelink.bio` | `Password123!` | `OWNER` | **Platform Founder & Owner Account** (`/@crisarando`). Complete personal Creator Studio access + direct access to `/admin/moderation` + global SaaS financial telemetry (MRR/ARR). |
| **Cris Super Admin** | `admin@onelink.bio` | `Password123!` | `SUPER_ADMIN` | **Global Infrastructure & Security Admin**. Operates exclusively in **Sentinel AI Threat Center** (`/admin/moderation`) with User Directory & Threat Governance (ban/unban, role updates, threat queue, domain blocklisting). |
| **Crypto Free Airdrops** | `drainer@crypto-scam.xyz` | `Password123!` | `CREATOR` *(Banned)* | **Malicious Test Account**. Seeded with punycode crypto-drainer contracts, automatically blocked and suspended by Sentinel AI to demonstrate threat neutralization. |
| **Daily Promo Deals** | `deals@daily-promos.top` | `Password123!` | `CREATOR` *(Suspicious)* | **Suspicious Phishing Account**. Seeded with brand impersonation links (`.top` domain) currently flagged as `SUSPICIOUS` for admin review and moderation. |

> 📖 *For complete details on role hierarchies, Workspace team roles, and security policies, see [docs/demo-accounts.md](./docs/demo-accounts.md).*

---

## 🛠️ Master Command Reference

All primary commands can be executed from the **monorepo root**:

### 🐳 Infrastructure (Docker)
| Command | Action |
|---|---|
| `pnpm docker:up` | Starts Postgres (TimescaleDB), Redis, and Mailhog in background |
| `pnpm docker:down` | Stops and removes local Docker containers |
| `pnpm docker:logs` | Streams live logs from all infrastructure containers |

### 🗄️ Database (Prisma & PostgreSQL)
| Command | Action |
|---|---|
| `pnpm db:push` | Synchronizes Prisma schema directly with PostgreSQL database |
| `pnpm db:seed` | Populates database with preset themes and initial records |
| `pnpm db:studio` | Opens Prisma Studio web UI at `http://localhost:5555` |
| `pnpm db:generate` | Re-generates `@prisma/client` types after schema edits |

### 💻 Development Servers
| Command | Action |
|---|---|
| `pnpm dev` | Starts all applications concurrently (`apps/api` + `apps/web`) |
| `pnpm dev:api` | Starts only the NestJS backend API (`http://localhost:3001`) |
| `pnpm dev:web` | Starts only the Next.js frontend web app (`http://localhost:3000`) |

### 🧪 Quality Assurance, Testing & Build
| Command | Action |
|---|---|
| `pnpm typecheck` | Runs TypeScript typechecks across all 5 workspace packages |
| `pnpm test` | Runs unit test suites with Jest |
| `pnpm build` | Compiles production builds (NestJS SWC + Next.js Turbopack) |
| `pnpm lint` | Runs ESLint 9 across all packages |
| `pnpm format` | Formats all code, docs, and JSON with Prettier |

---

## 🗂️ Monorepo Structure

```
.
├── apps/
│   ├── api/                    # NestJS 12 REST API (Port 3001, SWC, Swagger)
│   │   ├── src/                # Core modules (auth, profile, link, analytics)
│   │   └── test/               # Integration and E2E test suites
│   └── web/                    # Next.js 16 Web App (Port 3000, App Router, React 19)
│       └── src/app/            # Vanity profiles (/@username) & Creator Studio
├── packages/
│   ├── prisma/                 # Prisma 6 schema, migrations, seed script
│   ├── shared/                 # Zod validation schemas, universal types & constants
│   └── typescript-config/      # Shared tsconfig profiles (base, nestjs, nextjs)
├── infrastructure/
│   └── docker/                 # docker-compose.yml (TimescaleDB, Redis, Mailhog)
└── docs/                       # Complete SDLC documentation & specifications
```

---

## 💎 Release Feature Highlights & Subscription Tiers

| Tier | Price | Highlights |
|---|---|---|
| **Free Plan** | **$0 / forever** | 5 active links, standard bio profile, 7-day analytics retention, mobile responsive reader |
| **Creator Pro** | **$2.00 / month** ($20/yr) | Unlimited links, Link Scheduling, 0% tip fee, 90-day telemetry, no watermark, calibrated WCAG AAA themes |
| **Enterprise Studio** | **$5.00 / month** ($50/yr) | 5 collaborative team seats with hierarchical RBAC, PIN/password locked links, 18+ age gate, executive CSV export, custom domain support |

### 🚀 Core Platform Capabilities
- **Responsive Mobile Studio Dashboard**: Dynamic segmented control (`[ Editor | Live Preview ]`), responsive device frames (MacBook Pro 16" & fluid iPhone chassis), and non-colliding two-tier link cards.
- **Interactive Digital Notepad (`NOTE` Block)**: Rich-text announcement and memo block that opens a frosted-glass reader modal with word count badge and one-click "Copy Text" button.
- **WCAG AAA Theme Engine**: 8 calibrated high-contrast presets (Minimal Dark, Alpine Snow, Sunset Aurora, Forest Emerald, Midnight Ocean, Cyberpunk Neon, Bento Linen, Solar Gold).
- **Enterprise Multi-User RBAC**: Numerical hierarchy (`Platform Owner (5)` > `Admin (4)` > `Safety Admin (3)` > `Content Editor (2)` > `Viewer (1)`) with anti-redundancy and anti-recursion guardrails.
- **Stripe Tax Invoices & PDF Receipts**: Native Stripe customer portal integration and instant official PDF invoice receipt downloads.
- **Sentinel AI Threat Engine**: Zero-token in-process lexical analysis and ONNX threat classification intercepting crypto-drainers, phishing, and malware in <18ms.

---

## ⚖️ Key Engineering Decisions & System Design Trade-offs

| Decision | Chosen Approach | Trade-off & Architectural Rationale |
|---|---|---|
| **URL Threat Detection** | **In-process ONNX Random Forest (`onnxruntime-node`) + Redis `O(1)` Blocklist** | Eliminates 300–1200ms external LLM/API round-trips and per-request token costs; guarantees `<18ms` inline validation when creators publish links, backed by deterministic Punycode/homoglyph and Shannon entropy checks. |
| **Public Profile Hot Path** | **Redis Cache-Aside (`profile:<username>`) + Next.js Partial Prerendering** | Offloads viral read spikes from PostgreSQL (`1h` TTL) with immediate reactive key eviction on link, theme, social, or moderation mutations (trade-off: explicit cache invalidation discipline across write services). |
| **Cross-Origin & Auth Flow** | **Same-Origin Next.js Reverse Proxy (`/api/[...path]`)** | Routes browser requests on the frontend origin and translates backend `Location` redirects cleanly across `localhost`, LAN IPs, and Vercel previews, avoiding CORS preflight overhead and Safari/mobile fetch failures. |
| **Analytics Ingestion** | **Client `navigator.sendBeacon()` + PostgreSQL/TimescaleDB + SHA-256 IP Hashing** | Non-blocking click and view beacons prevent outbound navigation latency while preserving GDPR-compliant hashed IP telemetry. |
| **Billing & OAuth Ergonomics** | **Dual-Mode Live Credentials + Deterministic Dev Sandbox** | Seamlessly switches between live Stripe/Google Cloud OAuth in production and zero-credential simulation locally so reviewers can test end-to-end flows immediately without external API keys. |

---

## 📚 SDLC Documentation Hub

Every technical decision, schema, user journey, and wireframe is formally documented in [`docs/`](./docs):

- 📋 **[Progress Tracker & Setup Log](./docs/progress-tracker.md)**: Full inventory of setup and SDLC checklist.
- 🌿 **[Git Flow Branching & Release Strategy](./docs/git-flow.md)**: Official Git Flow model (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`), SemVer, and Conventional Commits.
- 🚀 **[Free Forever Production Deployment Guide](./DEPLOYMENT.md)**: Zero-cost deployment roadmap using Vercel, Render/Koyeb, Neon PostgreSQL, and Upstash Redis without 30-day trial cutoffs.
- 👥 **[Demo Accounts & Role Guide](./docs/demo-accounts.md)**: Preconfigured seed accounts, role hierarchy, and login guide.
- 🗺️ **[Master Documentation Hub](./docs/README.md)**: Master map of all specifications.
- 📄 **[Product Requirements Document (PRD)](./docs/prd.md)**: Personas, Gherkin user stories, MoSCoW.
- 📑 **[Software Requirements Specification (SRS)](./docs/srs.md)**: IEEE 830 functional & non-functional requirements.
- 🗄️ **[Database Design & ERD](./docs/architecture/database-design.md)**: Mermaid ERD, TimescaleDB Hypertables, indexes.
- 🏛️ **[System Architecture (C4)](./docs/architecture/system-architecture.md)**: C4 Context, Container, Component, and Deployment diagrams.
- 🔄 **[Sequence Flows](./docs/architecture/sequence-flows.md)**: Hot path profile rendering, click beacons, and caching.
- 🎨 **[UI/UX Wireframes & Google Stitch](./docs/ui-ux/wireframes-and-mockups.md)**: Split-screen dashboard wireframes & design tokens.
- 🧪 **[Quality & Test Plan](./docs/test-plan.md)**: TDD Red-Green-Refactor testing matrix.
- 📐 **[Architecture Decision Records (ADR)](./docs/adr/)**: ADRs 001 through 004.

