# 💻 Frontend Web Application (`apps/web`)

> Next.js 16 App Router web application serving ultra-fast public vanity profiles (`/@username`) and the interactive Creator Studio Dashboard.

---

## ⚡ Specifications

- **Framework**: [Next.js 16.4+](https://nextjs.org/) (App Router, React Server Components)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/turbopack`
- **Port**: `3000`
- **Validation**: Integrated with `@repo/shared` Zod schemas
- **Rendering Strategy**: Incremental Static Regeneration (ISR) with tag-based on-demand revalidation for public creator profiles (`/@username`).

---

## 🛠️ Local Development Commands

Run from monorepo root:
```bash
# Start Next.js development server with Turbopack
pnpm dev:web

# Run linter
pnpm --filter web lint

# Build production bundle
pnpm --filter web build

# Start production server
pnpm --filter web start
```

Or from inside `apps/web`:
```bash
pnpm dev
pnpm build
pnpm lint
```

---

## 🧭 Application Routes

```
src/app/
├── layout.tsx                  # Root layout (Geist/Inter fonts, metadata)
├── page.tsx                    # Marketing landing page & live handle availability check
├── globals.css                 # Tailwind v4 configuration and Carbon color theme tokens
│
├── (auth)/
│   ├── login/page.tsx          # Email/password + Google OAuth sign-in
│   └── register/page.tsx       # Vanity handle registration
├── auth/callback/page.tsx      # OAuth callback token handler
├── api/[...path]/route.ts      # Same-origin reverse proxy to NestJS API
│
├── [username]/page.tsx         # Public profile route (/@crisarando) with Partial Prerendering
├── user/page.tsx               # Quick demo profile alias
│
├── admin/moderation/page.tsx   # Sentinel AI Threat Center & User Governance (RBAC)
│
└── studio/                     # Creator Studio (Protected)
    ├── layout.tsx              # Studio navigation, multi-tenant workspace switcher & mobile bar
    ├── page.tsx                # Studio index redirect
    ├── links/page.tsx          # 60/40 drag-and-drop link/note/tip manager + live device preview
    ├── appearance/page.tsx     # 8 WCAG AAA presets, custom theme & button geometry customizer
    ├── analytics/page.tsx      # TimescaleDB metrics, time-series chart & CSV export
    ├── billing/page.tsx        # Stripe tiers, team collaborator seats & downloadable VAT receipts
    └── settings/page.tsx       # SEO metadata, search indexing & bio page availability
```

---

## 🎨 UI/UX Mockup Alignment

For full wireframe mockups, component hierarchy, and Google Stitch / Figma tokens, see:
👉 [`docs/ui-ux/wireframes-and-mockups.md`](../../docs/ui-ux/wireframes-and-mockups.md)
