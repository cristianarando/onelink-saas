"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchCurrentUser,
  fetchMySubscription,
  CurrentUserSession,
  BillingSubscription,
} from "@/lib/api-client";

export interface ActiveWorkspaceSnapshot {
  id: string;
  ownerUserId: string;
  ownerUsername: string;
  ownerProfileId: string;
  ownerPlan?: string;
  role?: string;
}

export interface UseStudioWorkspaceResult {
  user: CurrentUserSession | null;
  profileId: string;
  username: string;
  subscription: BillingSubscription | null;
  isCollaborative: boolean;
  activeWorkspace: ActiveWorkspaceSnapshot | null;
  publicOrigin: string;
  publicProfileUrl: string;
  loading: boolean;
  unauthenticated: boolean;
  refreshWorkspace: () => Promise<void>;
}

const FALLBACK_APP_ORIGIN = "https://onelink-saas.vercel.app";

export function resolvePublicOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return (process.env.NEXT_PUBLIC_APP_URL || FALLBACK_APP_ORIGIN).replace(/\/+$/, "");
}

function buildCollaborativeSubscription(ws: ActiveWorkspaceSnapshot): BillingSubscription {
  return {
    id: `sub_${ws.ownerUserId}`,
    userId: ws.ownerUserId,
    planId: "plan_ent",
    status: "ACTIVE",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    plan: {
      id: "plan_ent",
      name: "Enterprise Studio",
      code: ws.ownerPlan || "ENTERPRISE",
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
  };
}

/**
 * Shared hook that resolves the authenticated creator session, active subscription tier,
 * and active collaborative workspace across all Studio routes.
 */
export function useStudioWorkspace(): UseStudioWorkspaceResult {
  const [user, setUser] = useState<CurrentUserSession | null>(null);
  const [profileId, setProfileId] = useState("");
  const [username, setUsername] = useState("");
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);

  const refreshWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [userSession, sub] = await Promise.all([
        fetchCurrentUser(),
        fetchMySubscription(),
      ]);

      setUser(userSession);

      let resolvedProfileId = "";
      let resolvedUsername = "";
      let resolvedWs: ActiveWorkspaceSnapshot | null = null;
      let effectiveSub = sub;

      const storedWs =
        typeof window !== "undefined"
          ? localStorage.getItem("onelink_active_workspace")
          : null;

      if (storedWs) {
        try {
          const parsedWs = JSON.parse(storedWs) as ActiveWorkspaceSnapshot;
          if (parsedWs.ownerProfileId && parsedWs.ownerUsername) {
            resolvedWs = parsedWs;
            resolvedProfileId = parsedWs.ownerProfileId;
            resolvedUsername = parsedWs.ownerUsername;
            effectiveSub = buildCollaborativeSubscription(parsedWs);
          }
        } catch {
          // Ignore malformed workspace snapshot
        }
      }

      if (!resolvedProfileId && userSession?.profile?.id) {
        resolvedProfileId = userSession.profile.id;
        resolvedUsername = userSession.profile.username;
      }

      setActiveWorkspace(resolvedWs);
      setSubscription(effectiveSub);
      setProfileId(resolvedProfileId);
      setUsername(resolvedUsername);
      setUnauthenticated(!userSession && !resolvedProfileId);
    } catch {
      setUnauthenticated(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshWorkspace();
    }, 0);

    const handleChange = () => {
      void refreshWorkspace();
    };
    window.addEventListener("workspace_changed", handleChange);
    window.addEventListener("subscription_updated", handleChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("workspace_changed", handleChange);
      window.removeEventListener("subscription_updated", handleChange);
    };
  }, [refreshWorkspace]);

  const publicOrigin = resolvePublicOrigin();
  const publicProfileUrl = username ? `${publicOrigin}/${username}` : publicOrigin;

  return {
    user,
    profileId,
    username,
    subscription,
    isCollaborative: Boolean(activeWorkspace),
    activeWorkspace,
    publicOrigin,
    publicProfileUrl,
    loading,
    unauthenticated,
    refreshWorkspace,
  };
}
