# 📦 Shared Contracts & Validation (`@repo/shared`)

> Universal TypeScript types, Zod validation schemas, and constants shared across `apps/api` and `apps/web`.

---

## ⚡ Exports

- **Auth, Profile & Link Schemas (`zod`)**:
  - `RegisterSchema`, `LoginSchema`, `UsernameFieldSchema`, `UpdateProfileSchema`, `UpdateCustomThemeSchema`.
  - `CreateLinkSchema`, `UpdateLinkSchema`, `UnlockLinkSchema`, `ReorderLinksSchema` supporting `LinkTypeEnum` (`LINK`, `HEADER`, `DIVIDER`, `DONATION`, `NOTE`), scheduling (`startsAt`/`expiresAt`), PIN protection, and 18+ age restriction.
  - `CreateSocialLinkSchema`, `UpdateSocialLinkSchema`, `ReorderSocialLinksSchema`.
  - `TrackClickSchema`, `TrackPageViewSchema`.
- **Sentinel AI & Moderation Schemas**:
  - `RoleEnum`, `ThreatTypeEnum`, `SecurityFlagStatusEnum`, `EvaluateUrlSchema`, `UpdateThreatStatusSchema`, `SuspendUserSchema`, `UpdateUserRoleSchema`, `CreateBlocklistSchema`.
- **Billing & Multi-Tenant Workspace Schemas**:
  - `CreateCheckoutSessionSchema`, `UpdatePlanSchema`, `InviteCollaboratorSchema`, `UpdateTeamMemberRoleSchema`.
- **Canonical Constants & Helpers**:
  - `CANONICAL_PLANS`: Single source of truth for `FREE` ($0), `PRO` ($2/mo, $20/yr), and `ENTERPRISE` ($5/mo, $50/yr) limits and feature flags.
  - `CANONICAL_THEME_PRESETS`: 8 calibrated WCAG AAA theme configurations.
  - `RESERVED_USERNAMES` & `isValidWebUrl()`: Route collision protection and domain-level URL validation.

---

## 🛠️ Usage Example

```typescript
// In apps/api (NestJS validation pipe):
import { RegisterSchema, type RegisterInput } from '@repo/shared';

export class RegisterDto implements RegisterInput {
  // Validated automatically using Zod
}

// In apps/web (React Hook Form / Zod resolver):
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type RegisterInput } from '@repo/shared';

const form = useForm<RegisterInput>({
  resolver: zodResolver(RegisterSchema),
});
```
