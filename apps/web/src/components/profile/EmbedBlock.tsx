"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GitFork,
  Music,
  Play,
  Sparkles,
  Star,
  Code2,
} from "lucide-react";
import { parseEmbedDisplayMode, parseEmbedUrl } from "@/lib/embed-parser";

interface GithubRepoInfo {
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
}

interface EmbedBlockProps {
  id: string;
  title: string;
  url: string | null;
  content?: string | null;
  badge?: string | null;
  isFeatured?: boolean;
  countdownLabel?: string | null;
  isPageLight: boolean;
  btnStyle?: string;
  btnColor?: string;
  btnTextColor?: string;
  btnRadius?: number;
  onInteract?: () => void;
  compactPreview?: boolean;
}

export function EmbedBlock({
  title,
  url,
  content,
  badge,
  isFeatured = false,
  countdownLabel,
  isPageLight,
  btnColor = "#18181b",
  btnTextColor = "#fafafa",
  btnRadius = 16,
  onInteract,
  compactPreview = false,
}: EmbedBlockProps) {
  const displayMode = parseEmbedDisplayMode(content);
  const parsed = parseEmbedUrl(url);
  const [overrideExpanded, setOverrideExpanded] = useState<{ mode: string; value: boolean } | null>(
    null
  );
  const isExpanded =
    overrideExpanded && overrideExpanded.mode === displayMode
      ? overrideExpanded.value
      : displayMode === "inline";
  const [ytActive, setYtActive] = useState(false);
  const [repoInfo, setRepoInfo] = useState<GithubRepoInfo | null>(null);

  const ghOwner = parsed.provider === "github" ? parsed.owner : "";
  const ghRepo = parsed.provider === "github" ? parsed.repo : "";

  useEffect(() => {
    if (parsed.provider !== "github" || !ghOwner || !ghRepo) return;
    let active = true;
    const cacheKey = `gh_repo_${ghOwner}_${ghRepo}`;

    Promise.resolve()
      .then(() => {
        if (!active) return null;
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            return JSON.parse(cached) as GithubRepoInfo;
          }
        } catch {
          // Ignore storage read errors
        }
        return null;
      })
      .then((cachedInfo) => {
        if (!active) return;
        if (cachedInfo) {
          setRepoInfo(cachedInfo);
          return;
        }
        return fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}`, {
          headers: { Accept: "application/vnd.github+json" },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!active || !data) return;
            const info: GithubRepoInfo = {
              fullName: data.full_name || `${ghOwner}/${ghRepo}`,
              description: data.description || null,
              language: data.language || null,
              stars: typeof data.stargazers_count === "number" ? data.stargazers_count : 0,
              forks: typeof data.forks_count === "number" ? data.forks_count : 0,
            };
            setRepoInfo(info);
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(info));
            } catch {
              // Ignore cache write failures
            }
          });
      })
      .catch(() => {
        // Offline/rate-limited fallback renders static card
      });

    return () => {
      active = false;
    };
  }, [parsed.provider, ghOwner, ghRepo]);

  const providerMeta =
    parsed.provider === "youtube"
      ? { label: "YouTube", icon: Play, accent: "text-rose-400" }
      : parsed.provider === "spotify"
        ? { label: "Spotify", icon: Music, accent: "text-emerald-400" }
        : parsed.provider === "github"
          ? { label: "GitHub Repo", icon: Code2, accent: "text-sky-400" }
          : { label: "Media", icon: ExternalLink, accent: "text-zinc-300" };

  const ProviderIcon = providerMeta.icon;
  const resolvedRadius = Math.min(Math.max(btnRadius, 12), 20);

  const cardSurfaceClass = isPageLight
    ? "bg-white/95 border border-black/10 text-zinc-950 shadow-sm"
    : "bg-zinc-900/90 border border-white/10 text-white shadow-lg";

  const spotlightRingClass = isFeatured
    ? "ring-2 ring-amber-400/75 shadow-[0_0_24px_rgba(251,191,36,0.18)]"
    : "";

  const handleToggleExpand = () => {
    const next = !isExpanded;
    setOverrideExpanded({ mode: displayMode, value: next });
    if (next) {
      onInteract?.();
    }
  };

  return (
    <div
      style={{ borderRadius: `${resolvedRadius}px` }}
      className={`w-full overflow-hidden transition-all duration-200 ${cardSurfaceClass} ${spotlightRingClass}`}
    >
      {/* Header / Collapsible Bar */}
      <button
        type="button"
        onClick={handleToggleExpand}
        className={`w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer transition-colors ${
          isPageLight ? "hover:bg-black/5" : "hover:bg-white/5"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isPageLight ? "bg-zinc-100 border border-black/10" : "bg-white/10 border border-white/10"
            }`}
          >
            <ProviderIcon className={`w-4 h-4 ${providerMeta.accent}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`${compactPreview ? "text-xs" : "text-sm"} font-semibold truncate`}>
                {title}
              </span>
              {isFeatured && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] font-mono font-bold uppercase shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Spotlight</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono opacity-70">
              <span>{providerMeta.label} Embed</span>
              {countdownLabel && <span className="text-amber-400">• {countdownLabel}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                isPageLight
                  ? "bg-black/10 text-zinc-900"
                  : "bg-white/10 text-zinc-200 border border-white/15"
              }`}
            >
              {badge}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 opacity-70" />
          ) : (
            <ChevronDown className="w-4 h-4 opacity-70" />
          )}
        </div>
      </button>

      {/* Expanded Rich Media Viewport */}
      {isExpanded && (
        <div className={`px-3 pb-3 pt-1 ${isPageLight ? "border-t border-black/5" : "border-t border-white/5"}`}>
          {parsed.provider === "youtube" && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
              {ytActive ? (
                <iframe
                  src={`${parsed.embedUrl}&autoplay=1`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="w-full h-full border-0"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setYtActive(true);
                    onInteract?.();
                  }}
                  className="relative w-full h-full group cursor-pointer block"
                  aria-label={`Play ${title}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={parsed.thumbnailUrl}
                    alt={title}
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}

          {parsed.provider === "spotify" && (
            <iframe
              src={parsed.embedUrl}
              title={title}
              height={parsed.compact ? 152 : compactPreview ? 232 : 352}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="w-full rounded-xl border-0 bg-black/20"
            />
          )}

          {parsed.provider === "github" && (
            <a
              href={parsed.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onInteract?.()}
              className={`block p-3.5 rounded-xl border transition-all ${
                isPageLight
                  ? "bg-zinc-50 border-black/10 hover:border-black/30 text-zinc-900"
                  : "bg-black/40 border-white/10 hover:border-white/25 text-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-mono font-bold truncate">
                    {repoInfo?.fullName || `${parsed.owner}/${parsed.repo}`}
                  </div>
                  <p className="text-[11px] opacity-75 line-clamp-2 mt-1 leading-relaxed">
                    {repoInfo?.description || "View source code, issues, and documentation on GitHub."}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-3 mt-3 text-[11px] font-mono opacity-80">
                {repoInfo?.language && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>{repoInfo.language}</span>
                  </span>
                )}
                {repoInfo && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span>{repoInfo.stars.toLocaleString()}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GitFork className="w-3 h-3 opacity-70" />
                      <span>{repoInfo.forks.toLocaleString()}</span>
                    </span>
                  </>
                )}
                {!repoInfo && <span>github.com/{parsed.owner}/{parsed.repo}</span>}
              </div>
            </a>
          )}

          {parsed.provider === "generic" && (
            <a
              href={parsed.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onInteract?.()}
              style={{
                backgroundColor: btnColor,
                color: btnTextColor,
              }}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium"
            >
              <span className="truncate">{parsed.url.replace(/^https?:\/\//, "")}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-2" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
