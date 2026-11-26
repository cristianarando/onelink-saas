"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Palette,
  Sparkles,
  Save,
  Check,
  User,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Eye,
} from "lucide-react";
import { ThemePreset, ThemePresetCard } from "@/components/studio/appearance/ThemePresetCard";
import {
  ButtonGeometrySelector,
  type ButtonSurfaceStyle,
} from "@/components/studio/appearance/ButtonGeometrySelector";
import { TypographySelector } from "@/components/studio/appearance/TypographySelector";
import { PhonePreview } from "@/components/studio/PhonePreview";
import { StudioLinkItem } from "@/components/studio/LinkCard";
import { CANONICAL_THEME_PRESETS } from "@repo/shared";
import {
  fetchProfile,
  fetchCurrentUser,
  fetchMyProfile,
  fetchProfileLinks,
  fetchSocialLinks,
  SocialLinkItem,
  apiSaveCustomTheme,
  apiUpdateProfile,
  apiCheckUsername,
} from "@/lib/api-client";

const PRESET_AVATARS = [
  {
    id: "av-1",
    label: "Studio Portrait",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "av-2",
    label: "Tech Creator",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "av-3",
    label: "Design Lead",
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "av-4",
    label: "Developer",
    url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "av-5",
    label: "Artist Glow",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
  },
  {
    id: "av-6",
    label: "Minimalist 3D",
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
  },
];

const THEME_PRESETS: ThemePreset[] = CANONICAL_THEME_PRESETS;

const WALLPAPER_PRESETS = [
  {
    id: "wp-concrete",
    label: "Architectural",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "wp-nebula",
    label: "Cosmic Nebula",
    url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "wp-mist",
    label: "Misty Peaks",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "wp-cyber",
    label: "Cyber Grid",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "wp-dunes",
    label: "Warm Dunes",
    url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1200&auto=format&fit=crop&q=80",
  },
  {
    id: "wp-ocean",
    label: "Deep Ocean",
    url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&auto=format&fit=crop&q=80",
  },
];

function findMatchingPreset(themeData: {
  bgValue?: string;
  btnColor?: string;
  name?: string;
}): ThemePreset | undefined {
  if (!themeData) return undefined;
  const bg = (themeData.bgValue || "").toLowerCase().trim();
  const btn = (themeData.btnColor || "").toLowerCase().trim();
  const name = (themeData.name || "").toLowerCase().trim();

  // 1. Canonical database preset name match
  if (name === "minimal dark" || name === "obsidian carbon") {
    return THEME_PRESETS.find((p) => p.id === "obsidian-carbon");
  }
  if (name === "clean light" || name === "minimalist paper" || name === "alpine snow") {
    return THEME_PRESETS.find((p) => p.id === "minimalist-paper");
  }
  if (name === "sunset aurora" || name === "sunset glow") {
    return THEME_PRESETS.find((p) => p.id === "sunset-aurora");
  }
  if (name === "forest emerald" || name === "emerald forest") {
    return THEME_PRESETS.find((p) => p.id === "emerald-forest");
  }
  if (name === "cyberpunk neon" || name === "cyberpunk glow") {
    return THEME_PRESETS.find((p) => p.id === "cyberpunk-neon");
  }
  const byName = THEME_PRESETS.find((p) => p.name.toLowerCase() === name);
  if (byName) return byName;

  // 2. Exact match against THEME_PRESETS
  for (const preset of THEME_PRESETS) {
    if (preset.bgValue.toLowerCase() === bg && preset.btnColor.toLowerCase() === btn) {
      return preset;
    }
  }

  // 3. Known legacy color equivalencies
  if (bg === "#09090b" && (btn === "#27272a" || btn === "#18181b")) {
    return THEME_PRESETS.find((p) => p.id === "obsidian-carbon");
  }
  if ((bg === "#f4f4f5" || bg === "#fafafa" || bg === "#f8fafc") && (btn === "#ffffff" || btn === "#18181b")) {
    return THEME_PRESETS.find((p) => p.id === "minimalist-paper");
  }

  return undefined;
}

export default function StudioAppearancePage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [initialUsername, setInitialUsername] = useState<string>("");
  const [checkingUsername, setCheckingUsername] = useState<boolean>(false);
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; reason?: string } | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
  );
  const [showAvatarPicker, setShowAvatarPicker] = useState<boolean>(false);
  const [customAvatarInput, setCustomAvatarInput] = useState<string>("");

  const [selectedThemeId, setSelectedThemeId] = useState<string>("obsidian-carbon");
  const [bgType, setBgType] = useState<"SOLID" | "GRADIENT" | "IMAGE">("SOLID");
  const [bgValue, setBgValue] = useState<string>("#09090b");
  const [btnRadius, setBtnRadius] = useState<number>(9999);
  const [btnStyle, setBtnStyle] = useState<ButtonSurfaceStyle>("FILLED");
  const [btnColor, setBtnColor] = useState<string>("#18181b");
  const [btnTextColor, setBtnTextColor] = useState<string>("#fafafa");
  const [textColor, setTextColor] = useState<string>("#fafafa");
  const [fontFamily, setFontFamily] = useState<string>("Geist");
  const [titleWeight, setTitleWeight] = useState<"font-normal" | "font-medium" | "font-semibold" | "font-bold">("font-semibold");
  const [displayName, setDisplayName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [studioLinks, setStudioLinks] = useState<StudioLinkItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");

  const cleanHandle = username.replace(/^@/, "").toLowerCase().trim();
  const isCheckingHandle =
    Boolean(cleanHandle) && cleanHandle !== initialUsername && cleanHandle.length >= 3;
  const effectiveUsernameStatus = isCheckingHandle ? usernameStatus : null;
  const effectiveCheckingUsername = isCheckingHandle && checkingUsername;

  // Debounced real-time username availability check
  useEffect(() => {
    const clean = username.replace(/^@/, "").toLowerCase().trim();
    if (!clean || clean === initialUsername || clean.length < 3) {
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      if (active) setCheckingUsername(true);
      try {
        const res = await apiCheckUsername(clean);
        if (active) setUsernameStatus(res);
      } catch {
        if (active) setUsernameStatus(null);
      } finally {
        if (active) setCheckingUsername(false);
      }
    }, 280);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [username, initialUsername]);

  // Load from database on mount with graceful local fallback
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      let targetUsername = "";
      let targetProfileId = "";

      // Check if an active workspace is selected in localStorage
      const activeWs = localStorage.getItem("onelink_active_workspace");
      if (activeWs) {
        try {
          const parsedWs = JSON.parse(activeWs);
          if (parsedWs.ownerUsername) {
            targetUsername = parsedWs.ownerUsername;
          }
          if (parsedWs.ownerProfileId) {
            targetProfileId = parsedWs.ownerProfileId;
          }
        } catch {
          // Ignore
        }
      }

      if (!targetUsername) {
        try {
          const userSession = await fetchCurrentUser();
          if (userSession?.profile?.username) {
            targetUsername = userSession.profile.username;
            targetProfileId = userSession.profile.id || "";
          }
        } catch {
          // Ignore
        }
      }

      if (!targetUsername) {
        if (isMounted) {
          router.push("/login");
        }
        return;
      }

      if (targetProfileId && isMounted) {
        setProfileId(targetProfileId);
      }
      if (targetUsername && isMounted) {
        setUsername(targetUsername);
        setInitialUsername(targetUsername);
      }

      try {
        const p =
          (!activeWs ? await fetchMyProfile() : null) ||
          (await fetchProfile(targetUsername));

        if (p && isMounted) {
          if (p.id) {
            setProfileId(p.id);
            if (Array.isArray(p.socialLinks) && isMounted) {
              setSocialLinks(p.socialLinks);
            } else {
              fetchSocialLinks(p.id)
                .then((sl) => {
                  if (isMounted) setSocialLinks(sl);
                })
                .catch(() => {});
            }
            try {
              const linksRes = await fetchProfileLinks(p.id);
              if (Array.isArray(linksRes) && isMounted) {
                setStudioLinks(
                  linksRes.map((l: Record<string, unknown>, idx: number) => ({
                    id: String(l.id || ""),
                    title: String(l.title || ""),
                    url: String(l.url || "#"),
                    content: (l.content as string) || undefined,
                    type: (l.type as StudioLinkItem["type"]) || "LINK",
                    thumbnailUrl: (l.thumbnailUrl as string) || undefined,
                    badge: (l.badge as string) || undefined,
                    isFeatured: Boolean(l.isFeatured),
                    isActive: l.isActive !== false,
                    clicks: Number(l.clickCount || 0),
                    position: typeof l.position === "number" ? l.position : idx,
                    startsAt: (l.startsAt as string) || undefined,
                    expiresAt: (l.expiresAt as string) || undefined,
                    isPasswordProtected: Boolean(l.isPasswordProtected),
                    isAgeRestricted: Boolean(l.isAgeRestricted),
                  }))
                );
              }
            } catch (err) {
              console.warn("Could not load links for preview:", err);
            }
          } else if (targetProfileId) {
            setProfileId(targetProfileId);
          }

          if (p.username) {
            setUsername(p.username);
            setInitialUsername(p.username);
          }
          if (p.avatarUrl) setAvatarUrl(p.avatarUrl);
          if (p.title) setDisplayName(p.title);
          if (p.bio) setBio(p.bio);

          const activeThemeData = p.customTheme || p.theme;
          if (activeThemeData) {
            setBgType(
              activeThemeData.bgType === "GRADIENT" || activeThemeData.bgType === "IMAGE"
                ? activeThemeData.bgType
                : "SOLID"
            );
            setBgValue(activeThemeData.bgValue || "#09090b");
            setBtnRadius(typeof activeThemeData.btnRadius === "number" ? activeThemeData.btnRadius : 9999);
            setBtnStyle((activeThemeData.btnStyle || "FILLED") as ButtonSurfaceStyle);
            setBtnColor(activeThemeData.btnColor || "#18181b");
            setBtnTextColor(activeThemeData.btnTextColor || "#fafafa");
            setTextColor(activeThemeData.textColor || "#fafafa");
            setFontFamily(activeThemeData.fontFamily || "Geist");

            const matchingPreset = findMatchingPreset(activeThemeData);
            if (matchingPreset) {
              setSelectedThemeId(matchingPreset.id);
              setIsCustomMode(false);
            } else {
              setSelectedThemeId("custom");
              setIsCustomMode(true);
            }
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch profile from server:", err);
      }

      // Scoped offline fallback strictly for targetUsername
      try {
        const workspaceKey = targetUsername ? `onelink_studio_appearance_${targetUsername}` : null;
        if (workspaceKey) {
          const stored = localStorage.getItem(workspaceKey);
          if (stored && isMounted) {
            const p = JSON.parse(stored);
            if (p.isCustomMode === true || p.selectedThemeId === "custom") {
              setIsCustomMode(true);
              setSelectedThemeId("custom");
            } else if (p.selectedThemeId) {
              setSelectedThemeId(p.selectedThemeId);
              setIsCustomMode(false);
            }
            if (p.bgType) setBgType(p.bgType);
            if (p.bgValue) setBgValue(p.bgValue);
            if (typeof p.btnRadius === "number") setBtnRadius(p.btnRadius);
            if (p.btnStyle) setBtnStyle(p.btnStyle);
            if (p.btnColor) setBtnColor(p.btnColor);
            if (p.btnTextColor) setBtnTextColor(p.btnTextColor);
            if (p.textColor) setTextColor(p.textColor);
            if (p.fontFamily) setFontFamily(p.fontFamily);
            if (p.titleWeight) setTitleWeight(p.titleWeight);
            if (p.displayName) setDisplayName(p.displayName);
            if (p.bio) setBio(p.bio);
            if (p.avatarUrl) setAvatarUrl(p.avatarUrl);
            if (p.username) setUsername(p.username);
          }
        }
      } catch {
        // Ignore
      }
    };

    const timer = setTimeout(loadData, 0);

    const handleWorkspaceChanged = () => {
      loadData();
    };
    window.addEventListener("workspace_changed", handleWorkspaceChanged);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      window.removeEventListener("workspace_changed", handleWorkspaceChanged);
    };
  }, [router]);

  const handleSelectPreset = (preset: ThemePreset) => {
    setSelectedThemeId(preset.id);
    setIsCustomMode(false);
    setBgType(preset.bgType);
    setBgValue(preset.bgValue);
    setBtnRadius(preset.btnRadius);
    setBtnStyle(preset.btnStyle);
    setBtnColor(preset.btnColor);
    setBtnTextColor(preset.btnTextColor);
    setTextColor(preset.textColor);
    setFontFamily(preset.fontFamily);

    if (username) {
      try {
        localStorage.setItem(
          `onelink_studio_appearance_${username}`,
          JSON.stringify({
            selectedThemeId: preset.id,
            isCustomMode: false,
            bgType: preset.bgType,
            bgValue: preset.bgValue,
            btnRadius: preset.btnRadius,
            btnStyle: preset.btnStyle,
            btnColor: preset.btnColor,
            btnTextColor: preset.btnTextColor,
            textColor: preset.textColor,
            fontFamily: preset.fontFamily,
          })
        );
      } catch {
        // Ignore
      }
    }
  };

  const handleBtnColorChange = (newColor: string) => {
    setBtnColor(newColor);
    const currentPreset = THEME_PRESETS.find((p) => p.id === selectedThemeId);
    if (!currentPreset || currentPreset.btnColor.toLowerCase() !== newColor.toLowerCase()) {
      setIsCustomMode(true);
      setSelectedThemeId("custom");
    }
  };

  const handleCustomBgChange = (newBg: string, type: "SOLID" | "GRADIENT" | "IMAGE") => {
    setBgType(type);
    setBgValue(newBg);
    setIsCustomMode(true);
    setSelectedThemeId("custom");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    const cleanUser = username.replace(/^@/, "").toLowerCase().trim();

    const appearanceData = {
      selectedThemeId: isCustomMode ? "custom" : selectedThemeId,
      bgType,
      bgValue,
      btnRadius,
      btnStyle,
      btnColor,
      btnTextColor,
      textColor,
      fontFamily,
      titleWeight,
      displayName,
      bio,
      username: cleanUser,
      avatarUrl,
      isCustomMode,
    };

    try {
      const workspaceKey = cleanUser ? `onelink_studio_appearance_${cleanUser}` : "onelink_studio_appearance";
      localStorage.setItem(workspaceKey, JSON.stringify(appearanceData));
      localStorage.removeItem("onelink_studio_appearance");
    } catch {
      // Ignore
    }

    let activeProfileId = profileId;
    if (!activeProfileId) {
      try {
        const userSession = await fetchCurrentUser();
        if (userSession?.profile?.id) {
          activeProfileId = userSession.profile.id;
          setProfileId(activeProfileId);
        }
      } catch {
        // Ignore
      }
    }

    if (!activeProfileId) {
      setSaveError("Profile ID not found. Please reload or log in again.");
      setIsSaving(false);
      return;
    }

    try {
      await apiUpdateProfile(activeProfileId, {
        username: cleanUser,
        title: displayName,
        bio,
        avatarUrl,
      });

      await apiSaveCustomTheme(activeProfileId, {
        bgType,
        bgValue,
        btnStyle,
        btnColor,
        btnTextColor,
        textColor,
        btnRadius,
        fontFamily,
      });
      setInitialUsername(cleanUser);
      setSaved(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile_updated", {
            detail: {
              avatarUrl,
              username: cleanUser,
              title: displayName,
              bio,
            },
          })
        );
      }
      setTimeout(() => setSaved(false), 2400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setSaveError(msg);
      setTimeout(() => setSaveError(null), 4500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-400 mx-auto flex flex-col lg:flex-row h-full min-h-0 overflow-hidden relative">
      {/* MOBILE SEGMENT CONTROLLER (< lg) */}
      <div className="lg:hidden flex items-center justify-center p-2.5 border-b border-white/5 bg-[#0e0e10]/90 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-white/10 w-full max-w-xs shadow-inner">
          <button
            type="button"
            onClick={() => setMobileTab("editor")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === "editor"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === "preview"
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {/* LEFT 60% CUSTOMIZATION PANEL */}
      <section
        className={`${
          mobileTab === "editor" ? "flex" : "hidden"
        } lg:flex w-full lg:w-[60%] flex-col p-3.5 sm:p-8 lg:p-10 pb-24 sm:pb-8 h-full overflow-y-auto space-y-5 sm:space-y-8 custom-scrollbar`}
      >
        {/* Header with Inline Save Button */}
        <div className="flex items-center justify-between gap-3 pb-3.5 sm:pb-6 border-b border-white/5">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
              <span className="sm:hidden">Appearance</span>
              <span className="hidden sm:inline">Appearance &amp; Branding</span>
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-zinc-400 mt-1">
              Customize your profile theme, vanity handle, avatar, and typography
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-75 rounded-full px-3.5 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm cursor-pointer shrink-0"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 stroke-3" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Save</span>
                <span className="hidden sm:inline">Changes</span>
              </>
            )}
          </button>
        </div>

        {saveError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{saveError}</span>
          </div>
        )}

        {/* SECTION 1: PROFILE IDENTITY */}
        <section className="space-y-4 bg-zinc-900/60 rounded-2xl p-6 border border-white/5 select-none">
          <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-white" />
              <h2 className="text-base font-semibold text-white tracking-tight">
                Profile Identity
              </h2>
            </div>
            <span className="text-[11px] font-mono uppercase text-zinc-400">
              BIO, HANDLE &amp; AVATAR
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar Pill & Picker Trigger */}
            <div className="flex flex-col items-center space-y-2 shrink-0">
              <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
                <div className="w-20 h-20 rounded-full p-0.5 ring-2 ring-white/20 hover:ring-white/50 bg-zinc-900 overflow-hidden transition-all shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl?.trim() || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-mono font-medium">
                  Change
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="text-[11px] font-mono text-zinc-400 hover:text-white underline cursor-pointer"
              >
                {showAvatarPicker ? "Close Picker" : "Change Avatar"}
              </button>
            </div>

            {/* Inputs */}
            <div className="flex-1 w-full space-y-3.5">
              {/* Vanity Handle with Live Availability Status */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono uppercase text-zinc-400">
                    Vanity Handle (your link)
                  </label>
                  {effectiveCheckingUsername && (
                    <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Checking...
                    </span>
                  )}
                  {!effectiveCheckingUsername && effectiveUsernameStatus && (
                    <span
                      className={`text-[10px] font-mono flex items-center gap-1 ${
                        effectiveUsernameStatus.available ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {effectiveUsernameStatus.available ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Available
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          {effectiveUsernameStatus.reason || "Taken"}
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div className={`flex items-center rounded-xl bg-zinc-900 border px-3 py-2 text-xs sm:text-sm transition-all ${
                  effectiveUsernameStatus && !effectiveUsernameStatus.available
                    ? "border-rose-500/50 focus-within:border-rose-500"
                    : effectiveUsernameStatus?.available
                      ? "border-emerald-500/50 focus-within:border-emerald-500"
                      : "border-white/10 focus-within:border-zinc-400"
                }`}>
                  <span className="text-zinc-500 font-mono">onelink.bio/</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="yourhandle"
                    className="w-full bg-transparent text-white font-mono pl-0.5 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                  Bio / Statement
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Avatar Presets & Custom URL Popover */}
          {showAvatarPicker && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-950/80 border border-white/10 space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-300 font-semibold uppercase">
                  Choose Creator Avatar
                </span>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grid of Presets */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(av.url);
                      setShowAvatarPicker(false);
                    }}
                    className={`relative p-1 rounded-xl border flex flex-col items-center gap-1 transition-all group ${
                      avatarUrl === av.url
                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                        : "border-white/10 bg-zinc-900 hover:border-zinc-500"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={av.url}
                      alt={av.label}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <span className="text-[10px] text-zinc-400 font-mono truncate w-full text-center">
                      {av.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Image URL Input */}
              <div className="pt-2 border-t border-white/5 flex gap-2">
                <input
                  type="url"
                  placeholder="Or paste any custom image URL (https://...)"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAvatarInput.trim()) {
                      setAvatarUrl(customAvatarInput.trim());
                      setCustomAvatarInput("");
                      setShowAvatarPicker(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition-all cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: CURATED THEMES */}
        <section className="space-y-4 bg-zinc-900/60 rounded-2xl p-6 border border-white/5 select-none">
          <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4 text-white" />
              <h2 className="text-base font-semibold text-white tracking-tight">
                Curated Themes
              </h2>
            </div>
            <span className="text-[11px] font-mono uppercase text-zinc-400">
              {THEME_PRESETS.length} PRESETS + CUSTOM
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
            {THEME_PRESETS.map((preset) => (
              <ThemePresetCard
                key={preset.id}
                preset={preset}
                isSelected={!isCustomMode && selectedThemeId === preset.id}
                onSelect={handleSelectPreset}
              />
            ))}

            {/* Custom Theme Card (+ Create Custom) */}
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                setSelectedThemeId("custom");
              }}
              className={`tactile-card relative p-3.5 rounded-xl border flex flex-col items-center justify-center h-36 cursor-pointer text-center gap-2 group transition-all select-none ${
                isCustomMode
                  ? "bg-zinc-800 ring-2 ring-white border-white text-white"
                  : "bg-zinc-900/80 border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-all">
                <Sliders className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium">Custom Preset</span>
              <span className="text-[10px] font-mono text-zinc-500">
                {isCustomMode ? "Active" : "Click to edit"}
              </span>
            </button>
          </div>

          {/* Custom Theme Editor Drawer when in custom mode */}
          {isCustomMode && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-4 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-semibold text-white">
                  CUSTOM BACKGROUND STYLING
                </span>
                <div className="flex items-center space-x-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setBgType("SOLID");
                      if (!bgValue.startsWith("#")) setBgValue("#09090b");
                    }}
                    className={`px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                      bgType === "SOLID"
                        ? "bg-white text-black font-semibold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Solid Color
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBgType("GRADIENT");
                      if (!bgValue.includes("gradient")) {
                        setBgValue("linear-gradient(135deg, #18181b 0%, #09090b 100%)");
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                      bgType === "GRADIENT"
                        ? "bg-white text-black font-semibold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Gradient
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBgType("IMAGE");
                      setTextColor("#fafafa");
                      if (!bgValue.startsWith("http")) {
                        setBgValue(WALLPAPER_PRESETS[0].url);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                      bgType === "IMAGE"
                        ? "bg-white text-black font-semibold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Image URL
                  </button>
                </div>
              </div>

              {bgType === "IMAGE" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-400">
                      Zero-Storage Wallpapers (External URL + Auto Dark Scrim)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {WALLPAPER_PRESETS.map((wp) => (
                      <button
                        key={wp.id}
                        type="button"
                        onClick={() => {
                          setBgType("IMAGE");
                          setBgValue(wp.url);
                          setTextColor("#fafafa");
                        }}
                        className={`relative h-14 rounded-lg overflow-hidden border transition-all cursor-pointer group ${
                          bgValue === wp.url
                            ? "border-white ring-2 ring-white/40"
                            : "border-white/10 hover:border-zinc-500"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={wp.url}
                          alt={wp.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-[9px] font-mono text-white truncate">
                          {wp.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-zinc-400 shrink-0">
                  {bgType === "IMAGE" ? "Wallpaper URL:" : "Background Value:"}
                </label>
                <input
                  type={bgType === "IMAGE" ? "url" : "text"}
                  value={bgValue}
                  placeholder={bgType === "IMAGE" ? "https://images.unsplash.com/..." : "#09090b"}
                  onChange={(e) => handleCustomBgChange(e.target.value, bgType)}
                  className="flex-1 min-w-44 px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs font-mono text-white"
                />
                {bgType !== "IMAGE" && (
                  <input
                    type="color"
                    value={bgValue.startsWith("#") ? bgValue : "#09090b"}
                    onChange={(e) => {
                      handleCustomBgChange(e.target.value, "SOLID");
                    }}
                    className="w-8 h-8 rounded bg-transparent cursor-pointer border border-white/10"
                    title="Pick solid background color"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-xs text-zinc-400">Page Heading &amp; Bio Text Color:</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setTextColor("#fafafa")}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer ${
                      textColor.toLowerCase() === "#fafafa" || textColor.toLowerCase() === "#ffffff"
                        ? "bg-white text-black border-white"
                        : "bg-zinc-950 text-zinc-300 border-white/10"
                    }`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextColor("#09090b")}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer ${
                      textColor.toLowerCase() === "#09090b" || textColor.toLowerCase() === "#0f172a"
                        ? "bg-white text-black border-white"
                        : "bg-zinc-950 text-zinc-300 border-white/10"
                    }`}
                  >
                    Dark
                  </button>
                  <input
                    type="color"
                    value={textColor.startsWith("#") ? textColor : "#fafafa"}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-7 h-7 rounded bg-transparent cursor-pointer border border-white/10"
                    title="Custom Page Text Color"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: BUTTON GEOMETRY & STYLES */}
        <ButtonGeometrySelector
          btnRadius={btnRadius}
          btnStyle={btnStyle}
          btnColor={btnColor}
          btnTextColor={btnTextColor}
          pageBgColor={bgValue}
          onChangeRadius={setBtnRadius}
          onChangeStyle={setBtnStyle}
          onChangeColor={handleBtnColorChange}
          onChangeTextColor={setBtnTextColor}
        />

        {/* SECTION 4: TYPOGRAPHY & FONT FAMILY */}
        <TypographySelector
          fontFamily={fontFamily}
          titleWeight={titleWeight}
          onChangeFont={setFontFamily}
          onChangeWeight={setTitleWeight}
        />

        {/* Tip Box */}
        <div className="tactile-card p-4 rounded-xl border border-white/5 bg-zinc-900/40 flex items-center space-x-3">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-zinc-400">
            Themes automatically sync with your public URL (<code className="text-white">/{username}</code>) with high-contrast accessibility standards and dark-mode optimization.
          </p>
        </div>
      </section>

      {/* RIGHT 40% LIVE PREVIEW PANEL */}
      <PhonePreview
        items={studioLinks}
        username={username}
        displayName={displayName}
        bio={bio}
        avatarUrl={avatarUrl}
        socialLinks={socialLinks}
        theme={{
          bgType,
          bgValue,
          btnRadius,
          btnStyle,
          btnColor,
          btnTextColor,
          textColor,
          fontFamily,
        }}
        className={mobileTab === "preview" ? "flex" : "hidden lg:flex"}
      />
    </main>
  );

}
