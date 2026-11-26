import { getApiBaseUrl } from "./api-config";
export { getApiBaseUrl };

const API_BASE_URL = {
  toString() {
    return getApiBaseUrl();
  },
};

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  cache?: RequestCache;
}

function buildErrorMessage(err: Record<string, unknown> | null, fallbackMsg: string): string {
  if (!err) return fallbackMsg;
  const rawMsg = Array.isArray(err.message)
    ? err.message.join(", ")
    : typeof err.message === "string"
      ? err.message
      : fallbackMsg;
  const signals = Array.isArray(err.signals) ? err.signals : [];
  const detail = signals.length > 0 ? ` (${signals[0]})` : "";
  return `${rawMsg}${detail}`;
}

/**
 * Centralized JSON HTTP client that guarantees consistent Content-Type and Bearer headers.
 */
async function apiFetchJson<T>(
  path: string,
  options: RequestOptions = {},
  errorMessage = "Request failed"
): Promise<T> {
  const { method = "GET", body, auth = true, cache } = options;
  const token = auth ? await getAuthToken() : null;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...(cache ? { cache } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(buildErrorMessage(err as Record<string, unknown> | null, errorMessage));
  }

  return (await res.json()) as T;
}

async function apiFetchOptional<T>(
  path: string,
  fallback: T,
  options: RequestOptions = { cache: "no-store" }
): Promise<T> {
  try {
    return await apiFetchJson<T>(path, { cache: "no-store", ...options });
  } catch {
    return fallback;
  }
}

/**
 * Gets the JWT Bearer token from localStorage for authenticated sessions.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("onelink_token");
}

/**
 * Gets JWT for Super Admin operations from localStorage.
 */
export async function getAdminAuthToken(): Promise<string | null> {
  return getAuthToken();
}

/**
 * Clear session token and any cached workspace/studio keys from local storage
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("onelink_token");
    localStorage.removeItem("onelink_active_workspace");
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("onelink_studio_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore storage access errors in restricted frames
    }
  }
}

/**
 * Confirm Stripe Checkout Session and activate subscription
 */
export async function apiConfirmCheckoutSession(
  sessionId: string
): Promise<{ success: boolean; planCode?: string }> {
  return apiFetchOptional(
    "/api/billing/confirm-session",
    { success: false },
    { method: "POST", body: { sessionId } }
  );
}

export interface CurrentUserSession {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBanned: boolean;
  createdAt: string;
  profile: {
    id: string;
    username: string;
    title: string | null;
    bio: string | null;
    avatarUrl: string | null;
    isPublished: boolean;
    themeId: string | null;
  } | null;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodEnd: string | null;
    plan: {
      id: string;
      code: string;
      name: string;
      priceCents: number;
      interval: string;
    };
  }>;
}

/**
 * Fetch authenticated current user session and creator profile from /api/auth/me
 */
export async function fetchCurrentUser(): Promise<CurrentUserSession | null> {
  const token = await getAuthToken();
  if (!token) return null;
  return apiFetchOptional<CurrentUserSession | null>("/api/auth/me", null);
}

export interface ApiThemeData {
  id?: string;
  name?: string;
  bgType: "SOLID" | "GRADIENT" | "IMAGE";
  bgValue: string;
  btnStyle: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED" | "GLASS";
  btnColor: string;
  btnTextColor: string;
  textColor: string;
  fontFamily: string;
  btnRadius?: number;
}

export interface ApiLinkRecord {
  id: string;
  profileId?: string;
  title: string;
  url?: string | null;
  content?: string | null;
  type: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE";
  position: number;
  thumbnailUrl?: string | null;
  badge?: string | null;
  isActive?: boolean;
  clickCount?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  isPasswordProtected?: boolean;
  isAgeRestricted?: boolean;
  [key: string]: unknown;
}

export interface ApiProfileResponse {
  id: string;
  username: string;
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  seoTitle?: string | null;
  seoDesc?: string | null;
  isPublished?: boolean;
  searchIndexing?: boolean;
  theme?: ApiThemeData | null;
  customTheme?: ApiThemeData | null;
  links?: ApiLinkRecord[];
  socialLinks?: SocialLinkItem[];
}

/**
 * Fetch full profile and links from API
 */
export async function fetchProfile(username: string): Promise<ApiProfileResponse | null> {
  return apiFetchOptional<ApiProfileResponse | null>(`/api/profiles/${username}`, null, { auth: false });
}

/**
 * Fetch all links for a profile (both active and inactive) for Creator Studio
 */
export async function fetchProfileLinks(profileId: string): Promise<ApiLinkRecord[] | null> {
  if (!profileId || !profileId.trim()) return [];
  return apiFetchOptional<ApiLinkRecord[] | null>(`/api/links/profile/${profileId}`, null);
}

/**
 * Fetch current authenticated user's profile and links via /api/profiles/me
 */
export async function fetchMyProfile(): Promise<ApiProfileResponse | null> {
  const token = await getAuthToken();
  if (!token) return null;
  return apiFetchOptional<ApiProfileResponse | null>("/api/profiles/me", null);
}

/**
 * Create a new link attached to a profile
 */
export async function apiCreateLink(
  profileId: string,
  link: {
    title: string;
    url: string;
    content?: string | null;
    type?: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE";
    badge?: string | null;
    thumbnailUrl?: string | null;
    startsAt?: string | null;
    expiresAt?: string | null;
    isPasswordProtected?: boolean;
    password?: string | null;
    isAgeRestricted?: boolean;
  }
): Promise<ApiLinkRecord> {
  if (!profileId || !profileId.trim()) {
    throw new Error("Profile ID is required to create a link.");
  }
  return apiFetchJson<ApiLinkRecord>(
    `/api/links/profile/${profileId}`,
    { method: "POST", body: link },
    "Failed to create link."
  );
}

/**
 * Update an existing link (title, URL, isActive, scheduling, protection)
 */
export async function apiUpdateLink(
  linkId: string,
  profileId: string,
  updates: {
    title?: string;
    url?: string;
    content?: string | null;
    isActive?: boolean;
    type?: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE";
    badge?: string | null;
    thumbnailUrl?: string | null;
    startsAt?: string | null;
    expiresAt?: string | null;
    isPasswordProtected?: boolean;
    password?: string | null;
    isAgeRestricted?: boolean;
  }
): Promise<ApiLinkRecord> {
  if (!profileId || !profileId.trim()) {
    throw new Error("Profile ID is required to update link.");
  }
  return apiFetchJson<ApiLinkRecord>(
    `/api/links/${linkId}/profile/${profileId}`,
    { method: "PATCH", body: updates },
    "Failed to update link."
  );
}

export interface ExtractedUrlMetadata {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

/**
 * Extract OpenGraph metadata (title, description, thumbnail) for a destination URL
 */
export async function apiExtractUrlMetadata(url: string): Promise<ExtractedUrlMetadata> {
  return apiFetchJson<ExtractedUrlMetadata>(
    "/api/links/extract-metadata",
    { method: "POST", body: { url } },
    "Unable to fetch metadata from target URL."
  );
}

/**
 * Unlock a password/PIN protected link
 */
export async function apiUnlockLink(linkId: string, passwordAttempt: string) {
  return apiFetchJson<{ success: boolean; url: string }>(
    `/api/links/${linkId}/unlock`,
    { method: "POST", body: { password: passwordAttempt }, auth: false },
    "Incorrect PIN or password."
  );
}

/**
 * Delete a link and compact positions
 */
export async function apiDeleteLink(linkId: string, profileId: string) {
  try {
    await apiFetchJson(`/api/links/${linkId}/profile/${profileId}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Atomically reorder links
 */
export async function apiReorderLinks(profileId: string, linkIds: string[]) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const items = linkIds
    .filter((id) => uuidRegex.test(id))
    .map((id, index) => ({ id, position: index }));

  if (items.length === 0) return true;

  try {
    await apiFetchJson(`/api/links/profile/${profileId}/reorder`, {
      method: "PUT",
      body: { items },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Save custom theme variables (background, button styles, typography)
 */
export async function apiSaveCustomTheme(
  profileId: string,
  themeData: {
    bgType: "SOLID" | "GRADIENT" | "IMAGE";
    bgValue: string;
    btnStyle: "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED" | "GLASS";
    btnColor: string;
    btnTextColor: string;
    textColor: string;
    btnRadius: number;
    fontFamily: string;
  }
) {
  if (!profileId || !profileId.trim()) {
    throw new Error("Profile ID is required to save theme.");
  }
  return apiFetchJson<ApiThemeData>(
    `/api/profiles/${profileId}/custom-theme`,
    { method: "PUT", body: themeData },
    "Failed to save custom theme."
  );
}

export interface UpdateProfilePayload {
  username?: string;
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isPublished?: boolean;
  seoTitle?: string | null;
  seoDesc?: string | null;
  themeId?: string | null;
  searchIndexing?: boolean;
}

/**
 * Check if a vanity username handle is available in real time
 */
export async function apiCheckUsername(
  username: string
): Promise<{ available: boolean; username: string; reason?: string }> {
  const clean = (username || "").replace(/^@/, "").toLowerCase().trim();
  if (!clean) return { available: false, username: "", reason: "Username is required" };
  return apiFetchOptional(
    `/api/profiles/check-username/${encodeURIComponent(clean)}`,
    { available: false, username, reason: "Unable to check availability" },
    { auth: false }
  );
}

/**
 * Update profile identity (username, title, bio, avatar, SEO, publication)
 */
export async function apiUpdateProfile(
  profileId: string,
  data: UpdateProfilePayload
) {
  if (!profileId || !profileId.trim()) {
    throw new Error("Profile ID is required to update profile.");
  }
  await apiFetchJson(
    `/api/profiles/${profileId}`,
    { method: "PATCH", body: data },
    "Failed to update profile"
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("profile_updated", { detail: data }));
  }

  return true;
}

export interface AnalyticsData {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalViews: number;
    viewsGrowth: number;
    totalClicks: number;
    clicksGrowth: number;
    ctr: number;
    activeLinksCount: number;
  };
  timeSeries: Array<{
    date: string;
    views: number;
    clicks: number;
  }>;
  topLinks: Array<{
    id: string;
    title: string;
    url: string | null;
    clicks: number;
    ctr: number;
  }>;
  trafficSources: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  deviceBreakdown: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  osBreakdown: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Fetch aggregated creator analytics from API
 */
export async function fetchProfileAnalytics(
  profileId: string,
  days = 30
): Promise<AnalyticsData | null> {
  return apiFetchOptional<AnalyticsData | null>(
    `/api/analytics/profile/${profileId}?days=${days}`,
    null
  );
}

// ============================================================================
// Sentinel AI & Super Admin Moderation Types & Client APIs
// ============================================================================

export interface SentinelTelemetry {
  status: string;
  mode: string;
  latencySlaMs: number;
  layersActive: string[];
  totalFlagsRecorded: number;
  breakdown: Array<{ status: string; _count: { id: number } }>;
}

export interface SecurityThreatItem {
  id: string;
  userId: string;
  submittedUrl: string;
  riskScore: number;
  threatType: "PHISHING" | "MALWARE" | "CRYPTO_DRAINER" | "SPAM";
  aiConfidence: number;
  ipAddress: string | null;
  status: "BLOCKED_AUTO" | "PENDING_REVIEW" | "RESOLVED_BENIGN" | "BANNED";
  resolutionNotes: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    isBanned: boolean;
    profile?: {
      username: string;
      title: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface DomainBlocklistItem {
  id: string;
  domainPattern: string;
  reason: string;
  createdAt: string;
  addedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface AdminAuditLogItem {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  adminUser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

export interface SentinelEvaluationResult {
  url: string;
  isSafe: boolean;
  action: "ALLOW" | "FLAG_FOR_REVIEW" | "BLOCK_IMMEDIATE" | "BLOCK" | "FLAG" | string;
  riskScore: number;
  confidence: number;
  aiConfidence?: number;
  threatType?: "PHISHING" | "MALWARE" | "CRYPTO_DRAINER" | "SPAM" | string | null;
  reasons: string[];
  signals?: string[];
  entropy?: number;
  normalizedDomain?: string;
  latencyMs: number;
  features?: Record<string, unknown>;
}

/**
 * Fetch Sentinel Engine Telemetry
 */
export async function fetchSentinelTelemetry(): Promise<SentinelTelemetry | null> {
  return apiFetchOptional<SentinelTelemetry | null>("/api/sentinel/telemetry", null, { auth: false });
}

/**
 * Fetch recent threats detected by Sentinel AI
 */
export async function fetchSecurityThreats(limit = 50): Promise<SecurityThreatItem[]> {
  return apiFetchOptional<SecurityThreatItem[]>(`/api/admin/security/threats?limit=${limit}`, []);
}

/**
 * Test & evaluate an arbitrary URL in real-time with the local ONNX model
 */
export async function evaluateUrlWithSentinel(url: string): Promise<SentinelEvaluationResult | null> {
  try {
    const data = await apiFetchJson<Record<string, unknown>>("/api/sentinel/evaluate", {
      method: "POST",
      body: { url },
      auth: false,
    });
    const reasonsList: string[] = Array.isArray(data.signals)
      ? (data.signals as string[])
      : Array.isArray(data.reasons)
        ? (data.reasons as string[])
        : [];
    const normalizedDomain = typeof data.normalizedDomain === "string" ? data.normalizedDomain : "";
    return {
      url:
        (typeof data.url === "string" && data.url) ||
        (normalizedDomain ? `https://${normalizedDomain}` : url),
      isSafe: Boolean(data.isSafe),
      action:
        typeof data.action === "string"
          ? data.action
          : data.isSafe
            ? "ALLOW"
            : "BLOCK_IMMEDIATE",
      riskScore: typeof data.riskScore === "number" ? data.riskScore : 0,
      confidence:
        typeof data.aiConfidence === "number"
          ? data.aiConfidence
          : typeof data.confidence === "number"
            ? data.confidence
            : 0.99,
      aiConfidence: typeof data.aiConfidence === "number" ? data.aiConfidence : undefined,
      threatType: typeof data.threatType === "string" ? data.threatType : null,
      reasons: reasonsList,
      signals: reasonsList,
      entropy: typeof data.entropy === "number" ? data.entropy : 0,
      normalizedDomain,
      latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : 0,
      features:
        data.features && typeof data.features === "object"
          ? (data.features as Record<string, unknown>)
          : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Update the status of a SecurityFlag (e.g. resolve false positive or ban)
 */
export async function apiUpdateThreatStatus(
  flagId: string,
  status: string,
  notes?: string
): Promise<boolean> {
  try {
    await apiFetchJson(`/api/admin/security/threats/${flagId}/status`, {
      method: "PATCH",
      body: { status, notes },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch list of active domain blocklists
 */
export async function fetchDomainBlocklist(): Promise<DomainBlocklistItem[]> {
  return apiFetchOptional<DomainBlocklistItem[]>("/api/admin/security/blocklist", []);
}

/**
 * Add a domain pattern to global blocklist
 */
export async function apiAddDomainBlocklist(
  domainPattern: string,
  reason: string
): Promise<boolean> {
  try {
    await apiFetchJson("/api/admin/security/blocklist", {
      method: "POST",
      body: { domainPattern, reason },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a domain pattern from global blocklist
 */
export async function apiRemoveDomainBlocklist(id: string): Promise<boolean> {
  try {
    await apiFetchJson(`/api/admin/security/blocklist/${id}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Suspend or reinstate a creator user account
 */
export async function apiSuspendUser(
  userId: string,
  isBanned: boolean,
  reason: string
): Promise<boolean> {
  try {
    await apiFetchJson(`/api/admin/security/users/${userId}/suspend`, {
      method: "POST",
      body: { isBanned, reason },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch admin audit log entries
 */
export async function fetchAdminAuditLogs(limit = 30): Promise<AdminAuditLogItem[]> {
  return apiFetchOptional<AdminAuditLogItem[]>(`/api/admin/security/audit-logs?limit=${limit}`, []);
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string | null;
  role: "CREATOR" | "SUPER_ADMIN" | "OWNER";
  isBanned: boolean;
  createdAt: string;
  username: string | null;
  title: string | null;
  avatarUrl: string | null;
  isPublished: boolean;
  linksCount: number;
  threatCount: number;
}

/**
 * Fetch all platform users for Super Admin directory & governance
 */
export async function fetchAdminUsers(search?: string): Promise<AdminUserItem[]> {
  const query = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiFetchOptional<AdminUserItem[]>(`/api/admin/security/users${query}`, []);
}

/**
 * Update user platform role
 */
export async function apiUpdateUserRole(
  userId: string,
  role: "CREATOR" | "SUPER_ADMIN" | "OWNER"
): Promise<boolean> {
  try {
    await apiFetchJson(`/api/admin/security/users/${userId}/role`, {
      method: "PATCH",
      body: { role },
    });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Billing & Subscriptions API (Screen 6)
// ============================================================================

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  interval: "MONTHLY" | "YEARLY";
  features: {
    maxLinks?: number;
    customDomains?: boolean;
    removeBranding?: boolean;
    customThemes?: boolean;
    sentinelAiPro?: boolean;
    teamSeats?: number;
    analyticsRetentionDays?: number;
    [key: string]: unknown;
  };
  isActive?: boolean;
}

export interface BillingSubscription {
  id: string;
  userId: string;
  planId: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: BillingPlan;
}

export interface BillingInvoice {
  id: string;
  number: string;
  amountCents: number;
  currency: string;
  status: string;
  date: string;
  hostedInvoiceUrl?: string | null;
  pdfUrl?: string | null;
  planName?: string;
}

export interface BillingMetrics {
  mrr: number;
  mrrGrowthMoM: number;
  netNewMrr: number;
  arr: number;
  arrTarget: number;
  arrTargetProgress: number;
  paidSubscriptions: number;
  netChurn: number;
  conversionRate: number;
  totalUsers: number;
  arpu: number;
  arpuGrowthQoQ: number;
  ltvEst: number;
}

export interface BillingEvent {
  id: string;
  type: string;
  tier: string;
  amount: string;
  handle: string;
  timestamp: string;
  status: "Paid" | "Active" | "Refunded" | "Pending";
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Pending";
  statusDetail?: string;
  auth: string;
  initials: string;
}

export interface TeamResponse {
  success?: boolean;
  member?: TeamMember;
  members: TeamMember[];
  maxSeats: number;
  usedSeats: number;
}

const FALLBACK_PLANS: BillingPlan[] = [
  {
    id: "plan_free",
    code: "FREE",
    name: "Free Plan",
    priceCents: 0,
    interval: "MONTHLY",
    features: { maxLinks: 5, removeBranding: false, analyticsRetentionDays: 7 },
  },
  {
    id: "plan_pro",
    code: "PRO",
    name: "Creator Pro",
    priceCents: 200,
    interval: "MONTHLY",
    features: { maxLinks: 9999, removeBranding: true, customThemes: true, analyticsRetentionDays: 90 },
  },
  {
    id: "plan_ent",
    code: "ENTERPRISE",
    name: "Enterprise Studio",
    priceCents: 500,
    interval: "MONTHLY",
    features: {
      maxLinks: 9999,
      customDomains: true,
      removeBranding: true,
      customThemes: true,
      sentinelAiPro: true,
      teamSeats: 5,
      analyticsRetentionDays: 365,
    },
  },
];

/**
 * Fetch subscription plans catalog
 */
export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  return apiFetchOptional<BillingPlan[]>("/api/billing/plans", FALLBACK_PLANS, { auth: false });
}

/**
 * Fetch current creator subscription
 */
export async function fetchMySubscription(): Promise<BillingSubscription | null> {
  return apiFetchOptional<BillingSubscription | null>("/api/billing/subscription/me", null);
}

/**
 * Fetch founder financial KPIs
 */
export async function fetchBillingMetrics(): Promise<BillingMetrics> {
  return apiFetchOptional<BillingMetrics>("/api/billing/metrics", {
    mrr: 18450.0,
    mrrGrowthMoM: 24.6,
    netNewMrr: 3640.0,
    arr: 221400.0,
    arrTarget: 250000.0,
    arrTargetProgress: 88.5,
    paidSubscriptions: 1520,
    netChurn: 0.8,
    conversionRate: 4.8,
    totalUsers: 31400,
    arpu: 12.14,
    arpuGrowthQoQ: 11.2,
    ltvEst: 340.0,
  });
}

/**
 * Initiate checkout session (real Stripe or simulated instant upgrade)
 */
export async function apiCreateCheckoutSession(
  planCode: string,
  interval: "MONTHLY" | "YEARLY" = "MONTHLY"
): Promise<{ url: string; simulated?: boolean }> {
  return apiFetchJson(
    "/api/billing/create-checkout-session",
    { method: "POST", body: { planCode, interval } },
    "Failed to initiate checkout session"
  );
}

/**
 * Create customer billing portal session
 */
export async function apiCreatePortalSession(): Promise<{ url: string; simulated?: boolean }> {
  return apiFetchJson(
    "/api/billing/create-portal-session",
    { method: "POST", body: {} },
    "Failed to initiate portal session"
  );
}

/**
 * Fetch official billing invoices and downloadable PDF tax receipts
 */
export async function fetchInvoices(): Promise<BillingInvoice[]> {
  return apiFetchOptional<BillingInvoice[]>("/api/billing/invoices", []);
}

/**
 * Fetch live Stripe event ledger
 */
export async function fetchBillingEvents(): Promise<BillingEvent[]> {
  return apiFetchOptional<BillingEvent[]>("/api/billing/events", []);
}

/**
 * Fetch team members and seat allocation
 */
export async function fetchTeamMembers(): Promise<TeamResponse> {
  return apiFetchOptional<TeamResponse>("/api/billing/team", {
    members: [],
    maxSeats: 5,
    usedSeats: 0,
  });
}

/**
 * Invite a collaborator to the workspace
 */
export async function apiInviteTeamMember(data: {
  email: string;
  name: string;
  role: string;
}): Promise<TeamResponse> {
  return apiFetchJson(
    "/api/billing/team/invite",
    { method: "POST", body: data },
    "Failed to invite collaborator"
  );
}

/**
 * Revoke collaborator access
 */
export async function apiRevokeTeamMember(memberId: string): Promise<TeamResponse> {
  return apiFetchJson(
    `/api/billing/team/${memberId}`,
    { method: "DELETE" },
    "Failed to revoke collaborator"
  );
}

/**
 * Resend workspace collaboration invite email
 */
export async function apiResendTeamInvitation(memberId: string): Promise<{ success: boolean; message: string }> {
  return apiFetchJson(
    `/api/billing/team/${memberId}/resend`,
    { method: "POST" },
    "Failed to resend invitation email"
  );
}

/**
 * Update a collaborator's role with hierarchy enforcement
 */
export async function apiUpdateTeamMemberRole(memberId: string, role: string): Promise<TeamResponse> {
  return apiFetchJson(
    `/api/billing/team/${memberId}/role`,
    { method: "PATCH", body: { role } },
    "Failed to update collaborator role"
  );
}

export interface WorkspaceCollaboration {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerUsername: string;
  ownerProfileId: string;
  ownerAvatarUrl?: string | null;
  ownerPlan: string;
  role: string;
  email: string;
  name: string;
  status: "Active" | "Pending";
  statusDetail?: string;
  createdAt: string;
}

/**
 * Fetch workspaces where the current user is an invitee or collaborator
 */
export async function apiGetCollaborations(): Promise<WorkspaceCollaboration[]> {
  const token = await getAuthToken();
  if (!token) return [];
  return apiFetchOptional<WorkspaceCollaboration[]>("/api/billing/collaborations", []);
}

/**
 * Accept an invitation to collaborate on an Enterprise workspace
 */
export async function apiAcceptCollaboration(
  memberId: string
): Promise<{ success: boolean; collaboration: WorkspaceCollaboration }> {
  return apiFetchJson(
    `/api/billing/collaborations/accept/${memberId}`,
    { method: "POST" },
    "Failed to accept collaboration"
  );
}

/**
 * Decline an invitation to collaborate on a workspace
 */
export async function apiDeclineCollaboration(
  memberId: string
): Promise<{ success: boolean }> {
  return apiFetchJson(
    `/api/billing/collaborations/decline/${memberId}`,
    { method: "POST" },
    "Failed to decline collaboration"
  );
}

/**
 * Voluntarily leave/quit a collaborated workspace
 */
export async function apiLeaveCollaboration(
  memberId: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetchJson(
    `/api/billing/collaborations/leave/${memberId}`,
    { method: "POST" },
    "Failed to leave workspace"
  );
}

// ============================================================================
// Social Links Management APIs
// ============================================================================

export interface SocialLinkItem {
  id: string;
  profileId: string;
  platform:
    | "INSTAGRAM"
    | "TIKTOK"
    | "YOUTUBE"
    | "TWITTER"
    | "FACEBOOK"
    | "LINKEDIN"
    | "GITHUB"
    | "TWITCH"
    | "DISCORD"
    | "SPOTIFY"
    | "APPLEMUSIC"
    | "WEBSITE"
    | "EMAIL";
  url: string;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all social links for a given profile
 */
export async function fetchSocialLinks(
  profileId: string
): Promise<SocialLinkItem[]> {
  if (!profileId) return [];
  return apiFetchOptional<SocialLinkItem[]>(`/api/profiles/${profileId}/social-links`, []);
}

/**
 * Add a new social link icon to a profile
 */
export async function apiCreateSocialLink(
  profileId: string,
  data: {
    platform: string;
    url: string;
    position?: number;
    isActive?: boolean;
  }
): Promise<SocialLinkItem> {
  return apiFetchJson(
    `/api/profiles/${profileId}/social-links`,
    { method: "POST", body: data },
    "Failed to create social link"
  );
}

/**
 * Update an existing social link
 */
export async function apiUpdateSocialLink(
  profileId: string,
  linkId: string,
  data: {
    platform?: string;
    url?: string;
    position?: number;
    isActive?: boolean;
  }
): Promise<SocialLinkItem> {
  return apiFetchJson(
    `/api/profiles/${profileId}/social-links/${linkId}`,
    { method: "PATCH", body: data },
    "Failed to update social link"
  );
}

/**
 * Delete a social link
 */
export async function apiDeleteSocialLink(
  profileId: string,
  linkId: string
): Promise<{ success: boolean }> {
  return apiFetchJson(
    `/api/profiles/${profileId}/social-links/${linkId}`,
    { method: "DELETE" },
    "Failed to delete social link"
  );
}

/**
 * Atomically reorder social links
 */
export async function apiReorderSocialLinks(
  profileId: string,
  items: Array<{ id: string; position: number }>
): Promise<{ success: boolean }> {
  return apiFetchJson(
    `/api/profiles/${profileId}/social-links/reorder`,
    { method: "PUT", body: { items } },
    "Failed to reorder social links"
  );
}
