"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Globe,
  Shield,
  AlertTriangle,
  Save,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Download,
  Upload,
  Search,
  PowerOff,
  Power,
  Image as ImageIcon,
  X,
} from "lucide-react";
import {
  fetchProfile,
  fetchMyProfile,
  fetchCurrentUser,
  apiUpdateProfile,
  apiImportProfileSnapshot,
  type UpdateProfilePayload,
  type ImportProfileSnapshotPayload,
} from "@/lib/api-client";
import { resolvePublicOrigin } from "@/hooks/useStudioWorkspace";

export default function StudioSettingsPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [seoTitle, setSeoTitle] = useState<string>("");
  const [seoDesc, setSeoDesc] = useState<string>("");
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [searchIndexing, setSearchIndexing] = useState<boolean>(true);
  const [vcardEnabled, setVcardEnabled] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [savedNoticeText, setSavedNoticeText] = useState<string>("Settings successfully synchronized to database!");
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importDraft, setImportDraft] = useState<{
    fileName: string;
    payload: Omit<ImportProfileSnapshotPayload, "mode">;
  } | null>(null);
  const [importMode, setImportMode] = useState<"MERGE" | "REPLACE">("MERGE");
  const [importing, setImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Load initial settings from database with active workspace support
  useEffect(() => {
    let mounted = true;
    const initData = async () => {
      try {
        const userSession = await fetchCurrentUser();
        let usernameToLoad = userSession?.profile?.username || "";
        let profileIdToLoad = userSession?.profile?.id || "";

        // Check if user selected an active workspace
        const storedWs =
          typeof window !== "undefined"
            ? localStorage.getItem("onelink_active_workspace")
            : null;
        if (storedWs) {
          try {
            const parsedWs = JSON.parse(storedWs);
            if (parsedWs.ownerUsername) {
              usernameToLoad = parsedWs.ownerUsername;
            }
            if (parsedWs.ownerProfileId) {
              profileIdToLoad = parsedWs.ownerProfileId;
            }
          } catch {
            // Ignore parse error
          }
        }

        if (!usernameToLoad) {
          if (mounted) {
            router.push("/login");
          }
          return;
        }

        if (profileIdToLoad && mounted) {
          setProfileId(profileIdToLoad);
        }
        if (usernameToLoad && mounted) {
          setUsername(usernameToLoad);
        }

        const p =
          (!storedWs ? await fetchMyProfile() : null) ||
          (await fetchProfile(usernameToLoad));
        if (p && mounted) {
          if (p.id) setProfileId(p.id);
          if (p.username) setUsername(p.username);
          if (p.title) setTitle(p.title);
          if (p.bio) setBio(p.bio);
          if (p.seoTitle) setSeoTitle(p.seoTitle);
          if (p.seoDesc) setSeoDesc(p.seoDesc);
          if (p.isPublished !== undefined) setIsPublished(p.isPublished);
          if (p.searchIndexing !== undefined) setSearchIndexing(p.searchIndexing);
          if (p.vcardEnabled !== undefined) setVcardEnabled(p.vcardEnabled);
        }
      } catch {
        // Fallback to default state
      }
    };

    const handleWorkspaceChanged = () => {
      initData();
    };
    window.addEventListener("workspace_changed", handleWorkspaceChanged);

    const timer = setTimeout(initData, 0);
    return () => {
      mounted = false;
      clearTimeout(timer);
      window.removeEventListener("workspace_changed", handleWorkspaceChanged);
    };
  }, [router]);

  const handleToggleDeactivation = async () => {
    const nextPublishedState = !isPublished;
    setIsPublished(nextPublishedState);
    if (!profileId) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      const ok = await apiUpdateProfile(profileId, {
        isPublished: nextPublishedState,
      });
      if (ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setErrorMessage("Failed to update status on server.");
        setIsPublished(!nextPublishedState); // rollback
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error updating page status"
      );
      setIsPublished(!nextPublishedState); // rollback
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const publicUrl = `${resolvePublicOrigin()}/${username}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(publicUrl);
      }
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setErrorMessage(null);

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
      setErrorMessage("Profile ID not found. Please reload or log in again.");
      setSaving(false);
      return;
    }

    try {
      const payload: UpdateProfilePayload = {
        title,
        bio,
        seoTitle,
        seoDesc,
        isPublished,
        searchIndexing,
        vcardEnabled,
      };
      const ok = await apiUpdateProfile(activeProfileId, payload);
      if (ok) {
        setSavedNoticeText("Settings successfully synchronized to database!");
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setErrorMessage("Failed to save settings to server.");
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error saving settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSnapshotFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid snapshot format: expected a JSON object.");
      }

      const rawLinks = Array.isArray(parsed.links) ? parsed.links : [];
      const normalizedLinks = rawLinks
        .filter((l): l is Record<string, unknown> => Boolean(l && typeof l === "object" && l.title))
        .slice(0, 100)
        .map((l) => ({
          title: String(l.title),
          url: l.url ? String(l.url) : null,
          content: l.content ? String(l.content) : null,
          type: (l.type as "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE" | "EMBED") || "LINK",
          thumbnailUrl: l.thumbnailUrl ? String(l.thumbnailUrl) : null,
          badge: l.badge ? String(l.badge) : null,
          isActive: l.isActive !== false,
          isFeatured: Boolean(l.isFeatured),
          startsAt: l.startsAt ? String(l.startsAt) : null,
          expiresAt: l.expiresAt ? String(l.expiresAt) : null,
          isAgeRestricted: Boolean(l.isAgeRestricted),
        }));

      const rawSocials = Array.isArray(parsed.socialLinks) ? parsed.socialLinks : [];
      const normalizedSocials = rawSocials
        .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === "object" && s.platform && s.url))
        .slice(0, 20)
        .map((s) => ({
          platform: String(s.platform),
          url: String(s.url),
          isActive: s.isActive !== false,
        }));

      const rawTheme = (parsed.customTheme || parsed.theme) as Record<string, unknown> | null | undefined;
      const customTheme =
        rawTheme && typeof rawTheme === "object" && rawTheme.bgValue && rawTheme.btnColor
          ? {
              bgType: (rawTheme.bgType as "SOLID" | "GRADIENT" | "IMAGE") || "SOLID",
              bgValue: String(rawTheme.bgValue),
              btnStyle: (rawTheme.btnStyle as "FILLED" | "OUTLINE" | "SHADOW" | "ROUNDED" | "GLASS") || "FILLED",
              btnColor: String(rawTheme.btnColor),
              btnTextColor: String(rawTheme.btnTextColor || "#ffffff"),
              textColor: String(rawTheme.textColor || "#fafafa"),
              fontFamily: String(rawTheme.fontFamily || "Inter"),
              btnRadius: typeof rawTheme.btnRadius === "number" ? rawTheme.btnRadius : 12,
            }
          : null;

      setImportDraft({
        fileName: file.name,
        payload: {
          title: typeof parsed.title === "string" ? parsed.title : undefined,
          bio: typeof parsed.bio === "string" ? parsed.bio : undefined,
          seoTitle: typeof parsed.seoTitle === "string" ? parsed.seoTitle : undefined,
          seoDesc: typeof parsed.seoDesc === "string" ? parsed.seoDesc : undefined,
          searchIndexing: typeof parsed.searchIndexing === "boolean" ? parsed.searchIndexing : undefined,
          vcardEnabled: typeof parsed.vcardEnabled === "boolean" ? parsed.vcardEnabled : undefined,
          customTheme,
          links: normalizedLinks,
          socialLinks: normalizedSocials,
        },
      });
      setImportMode("MERGE");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Could not parse JSON snapshot file.");
    }
  };

  const handleConfirmImport = async () => {
    if (!importDraft) return;
    let activeProfileId = profileId;
    if (!activeProfileId) {
      const me = await fetchCurrentUser().catch(() => null);
      if (me?.profile?.id) {
        activeProfileId = me.profile.id;
        setProfileId(activeProfileId);
      }
    }
    if (!activeProfileId) {
      setImportError("Profile ID not found. Please reload or log in again.");
      return;
    }

    setImporting(true);
    setImportError(null);
    try {
      const res = await apiImportProfileSnapshot(activeProfileId, {
        mode: importMode,
        ...importDraft.payload,
      });

      if (importDraft.payload.title !== undefined) setTitle(importDraft.payload.title || "");
      if (importDraft.payload.bio !== undefined) setBio(importDraft.payload.bio || "");
      if (importDraft.payload.seoTitle !== undefined) setSeoTitle(importDraft.payload.seoTitle || "");
      if (importDraft.payload.seoDesc !== undefined) setSeoDesc(importDraft.payload.seoDesc || "");
      if (importDraft.payload.searchIndexing !== undefined) setSearchIndexing(importDraft.payload.searchIndexing);
      if (importDraft.payload.vcardEnabled !== undefined) setVcardEnabled(importDraft.payload.vcardEnabled);

      setImportDraft(null);
      setSavedNoticeText(
        `Snapshot imported (${res.mode}): ${res.importedLinks} links & ${res.importedSocials} social links synchronized.`
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4500);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Snapshot import failed.");
    } finally {
      setImporting(false);
    }
  };

  const handleExportJSON = async () => {
    const fullProfile =
      (await fetchMyProfile().catch(() => null)) ||
      (username ? await fetchProfile(username).catch(() => null) : null);

    const backup = {
      profileId,
      username,
      title,
      bio,
      seoTitle,
      seoDesc,
      isPublished,
      searchIndexing,
      vcardEnabled,
      theme: fullProfile?.theme || null,
      customTheme: fullProfile?.customTheme || null,
      links: fullProfile?.links || [],
      socialLinks: fullProfile?.socialLinks || [],
      exportedAt: new Date().toISOString(),
    };
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `onelink-settings-${username || "profile"}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 selection:bg-white/20 selection:text-white">
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/5 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            Studio Settings
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Manage your public vanity URL, SEO metadata, discoverability, and
            account preferences
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              savedSuccess
                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                : "bg-white text-black hover:bg-zinc-200 active:scale-98 shadow-sm"
            } disabled:opacity-50`}
          >
            {saving ? (
              <span className="animate-spin inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
            ) : savedSuccess ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Save className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>
              {saving ? "Saving..." : savedSuccess ? "Saved!" : "Save Changes"}
            </span>
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {savedSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{savedNoticeText}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* Section 1: Public Identity & Vanity URL */}
        <section className="p-6 rounded-xl bg-[#121215] border border-white/5 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-zinc-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Public Identity & Handle
              </h2>
              <p className="text-xs text-zinc-400">
                Your primary handle on OneLink and vanity URL routing
              </p>
            </div>
          </div>

          {/* Vanity URL preview */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Public Bio Link
            </label>
            <div className="flex items-center rounded-lg bg-[#09090b] border border-white/10 px-3 py-2 text-xs">
              <span className="text-zinc-500 select-none">
                https://onelink.bio/
              </span>
              <span className="font-semibold text-white">{username}</span>
              <div className="ml-auto flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center space-x-1 text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  title="Copy link"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-[11px]">
                        Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Copy</span>
                    </>
                  )}
                </button>
                <Link
                  href={`/${username}`}
                  target="_blank"
                  className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                  title="Open live page in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Vanity handles route directly to your high-performance edge page.
            </p>
          </div>

          {/* Display Name & Bio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="profile-display-title"
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
                Display Title
              </label>
              <input
                id="profile-display-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-white/30"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="profile-bio-text"
                  className="block text-xs font-medium text-zinc-400"
                >
                  Bio Text
                </label>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {bio.length}/150
                </span>
              </div>
              <input
                id="profile-bio-text"
                type="text"
                maxLength={150}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your audience about yourself..."
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-white/30"
              />
            </div>
          </div>
        </section>

        {/* Section 2: SEO & Search Engine Optimization */}
        <section className="p-6 rounded-xl bg-[#121215] border border-white/5 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-zinc-300">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Search Engine Optimization (SEO)
              </h2>
              <p className="text-xs text-zinc-400">
                Customize how your OneLink profile appears in Google searches
                and social share cards
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="seo-page-title"
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
                Custom SEO Page Title
              </label>
              <input
                id="seo-page-title"
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="e.g. Alex Rivera | Software Architect & Creator"
                className="w-full bg-[#09090b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-white/30"
              />
            </div>

            <div>
              <label
                htmlFor="seo-meta-description"
                className="block text-xs font-medium text-zinc-400 mb-1.5"
              >
                Meta Description
              </label>
              <textarea
                id="seo-meta-description"
                rows={2}
                value={seoDesc}
                onChange={(e) => setSeoDesc(e.target.value)}
                placeholder="Brief summary displayed under your search result..."
                className="w-full bg-[#09090b] border border-white/10 rounded-lg p-3 text-xs text-white placeholder-zinc-600 focus:outline-hidden focus:border-white/30 resize-none"
              />
            </div>

            {/* Google Search Snippet Simulation */}
            <div className="mt-4 p-4 rounded-xl bg-[#09090b] border border-white/5">
              <div className="flex items-center space-x-2 text-[11px] text-zinc-500 mb-2">
                <Search className="w-3.5 h-3.5" />
                <span className="font-medium uppercase tracking-wider">
                  Live Google Snippet Preview
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] text-zinc-400">
                  https://onelink.bio › @{username}
                </div>
                <div className="text-sm text-[#8ab4f8] hover:underline cursor-pointer font-medium truncate">
                  {seoTitle || `${title} | OneLink`}
                </div>
                <div className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {seoDesc || bio || "Connect with my links and projects on OneLink."}
                </div>
              </div>
            </div>

            {/* Dynamic OpenGraph Social Share Card Preview */}
            {username && (
              <div className="mt-4 p-4 rounded-xl bg-[#09090b] border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="flex items-center space-x-2">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span className="font-medium uppercase tracking-wider">
                      Dynamic OpenGraph Social Card (1200×630)
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400">
                    /api/og/{username}
                  </span>
                </div>
                <div className="rounded-lg overflow-hidden border border-white/10 bg-zinc-950 aspect-1200/630">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/og/${encodeURIComponent(username)}`}
                    alt={`OpenGraph preview for @${username}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Search Engine Discoverability */}
        <section className="p-6 rounded-xl bg-[#121215] border border-white/5 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-zinc-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Search Engine Indexing
              </h2>
              <p className="text-xs text-zinc-400">
                Control whether web crawlers and search engines can discover your bio
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-white">
                Allow Search Engines to Index Page
              </span>
              <p className="text-xs text-zinc-400 max-w-md">
                Allow Google, Bing, and DuckDuckGo bots to crawl your bio and index it in search results.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={searchIndexing}
              onClick={() => setSearchIndexing(!searchIndexing)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                searchIndexing ? "bg-white" : "bg-zinc-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full ${
                  searchIndexing ? "bg-black" : "bg-zinc-400"
                } shadow-lg ring-0 transition duration-200 ease-in-out ${
                  searchIndexing ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-white">
                Digital Contact Card (vCard .vcf)
              </span>
              <p className="text-xs text-zinc-400 max-w-md">
                Allow visitors to save your name, bio, public link, and social handles directly to mobile contacts.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={vcardEnabled}
              onClick={() => setVcardEnabled(!vcardEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                vcardEnabled ? "bg-white" : "bg-zinc-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full ${
                  vcardEnabled ? "bg-black" : "bg-zinc-400"
                } shadow-lg ring-0 transition duration-200 ease-in-out ${
                  vcardEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Section 4: Data Management & Danger Zone */}
        <section className="p-6 rounded-xl bg-[#121215] border border-white/5 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-zinc-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Account Data & Portability
              </h2>
              <p className="text-xs text-zinc-400">
                Export your creator configuration or manage sensitive settings
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-white">
                Export Creator Profile JSON
              </div>
              <p className="text-xs text-zinc-400">
                Download a complete portable snapshot of your links, themes, and
                settings.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleSelectSnapshotFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#09090b] border border-white/10 hover:border-white/25 text-xs font-medium text-white transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Snapshot</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#09090b] border border-white/10 hover:border-white/20 text-xs font-medium text-white transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Snapshot</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: Danger Zone - Deactivate Bio Page */}
        <section className="p-6 rounded-xl bg-linear-to-b from-[#181214] to-[#121215] border border-rose-500/25 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-rose-500/10">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-rose-200">
                Danger Zone: Bio Page Availability
              </h2>
              <p className="text-xs text-zinc-400">
                Temporarily disable your public vanity URL without deleting your account data
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-white">
                  Bio Page Status
                </span>
                {isPublished ? (
                  <span className="inline-flex items-center space-x-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Public & Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 text-[10px] text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Deactivated (Offline)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                {isPublished
                  ? `Your bio page at onelink.bio/${username || "user"} is currently active and visible to visitors. Deactivating it will display a temporary offline screen.`
                  : `Your bio page is currently deactivated. Visitors to onelink.bio/${username || "user"} see an offline screen. You can reactivate anytime with one click.`}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleDeactivation}
              disabled={saving}
              className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all shrink-0 cursor-pointer active:scale-95 ${
                isPublished
                  ? "bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white"
                  : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-md shadow-emerald-500/10"
              } disabled:opacity-50`}
            >
              {isPublished ? (
                <>
                  <PowerOff className="w-4 h-4" />
                  <span>Deactivate Bio Page</span>
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  <span>Reactivate Bio Page</span>
                </>
              )}
            </button>
          </div>
        </section>
      </div>

      {importDraft &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Import Creator Snapshot"
            onClick={() => !importing && setImportDraft(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#121215] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-semibold">Restore Profile Snapshot</h3>
                </div>
                <button
                  type="button"
                  onClick={() => !importing && setImportDraft(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 space-y-1.5 text-xs font-mono">
                <div className="text-zinc-400 truncate">File: {importDraft.fileName}</div>
                <div className="text-white">
                  Detected: <strong>{importDraft.payload.links?.length || 0}</strong> links ·{" "}
                  <strong>{importDraft.payload.socialLinks?.length || 0}</strong> social icons
                </div>
                <div className="text-zinc-400">
                  Theme: {importDraft.payload.customTheme ? "Included" : "Unchanged"} · SEO &amp; Bio:{" "}
                  {importDraft.payload.seoTitle || importDraft.payload.bio ? "Included" : "Partial"}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-mono uppercase text-zinc-400">Import Strategy</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode("MERGE")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      importMode === "MERGE"
                        ? "bg-white text-zinc-950 border-white font-semibold"
                        : "bg-zinc-900 border-white/10 text-zinc-300 hover:text-white"
                    }`}
                  >
                    <div>Merge Links</div>
                    <div className="text-[10px] opacity-75 font-normal">Keep current &amp; add new</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("REPLACE")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      importMode === "REPLACE"
                        ? "bg-rose-500 text-white border-rose-400 font-semibold"
                        : "bg-zinc-900 border-white/10 text-zinc-300 hover:text-white"
                    }`}
                  >
                    <div>Replace Links</div>
                    <div className="text-[10px] opacity-75 font-normal">Overwrite current stack</div>
                  </button>
                </div>
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-mono">
                  {importError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => setImportDraft(null)}
                  className="px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={handleConfirmImport}
                  className="px-4 py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {importing ? "Validating & Importing..." : "Import & Synchronize"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
