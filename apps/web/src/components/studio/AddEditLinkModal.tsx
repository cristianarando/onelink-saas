"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Link as LinkIcon,
  Type,
  Minus,
  Coffee,
  Sparkles,
  Clock,
  Lock,
  ShieldAlert,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  StickyNote,
  Loader2,
  Tags,
  Code2,
} from "lucide-react";
import { StudioLinkItem } from "./LinkCard";
import { AVAILABLE_LINK_ICONS } from "./IconHelper";
import { isValidWebUrl } from "@repo/shared";
import { apiExtractUrlMetadata } from "@/lib/api-client";
import { parseEmbedDisplayMode, parseEmbedUrl } from "@/lib/embed-parser";

export interface AddEditLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<StudioLinkItem, "position" | "clicks" | "id"> & { id?: string }) => Promise<void> | void;
  initialItem?: StudioLinkItem | null;
  defaultType?: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE" | "EMBED";
  userPlanCode?: string;
}

interface FormInnerProps {
  onClose: () => void;
  onSave: (data: Omit<StudioLinkItem, "position" | "clicks" | "id"> & { id?: string }) => Promise<void> | void;
  initialItem?: StudioLinkItem | null;
  defaultType: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE" | "EMBED";
  userPlanCode: string;
}

const TIP_PRESETS = [
  {
    name: "Buy Me a Coffee",
    icon: "☕",
    urlTemplate: "https://buymeacoffee.com/",
    defaultTitle: "Buy Me a Coffee ☕",
    defaultBadge: "☕ $3 Coffee",
  },
  {
    name: "Ko-fi",
    icon: "☕",
    urlTemplate: "https://ko-fi.com/",
    defaultTitle: "Support on Ko-fi ☕",
    defaultBadge: "☕ $3 Coffee",
  },
  {
    name: "PayPal.me",
    icon: "💙",
    urlTemplate: "https://paypal.me/",
    defaultTitle: "Tip via PayPal 💙",
    defaultBadge: "💙 $5 Tip",
  },
  {
    name: "Stripe Link",
    icon: "💳",
    urlTemplate: "https://buy.stripe.com/",
    defaultTitle: "Support with Card (Stripe)",
    defaultBadge: "0% FEE",
  },
];

const SUGGESTED_TIP_BADGES = ["☕ $3 Coffee", "☕☕ $5 Duo", "🍩 $10 Supporter", "0% FEE"];

const UTM_PRESETS = [
  { label: "Instagram Bio", source: "instagram", medium: "social", campaign: "link_in_bio" },
  { label: "TikTok Bio", source: "tiktok", medium: "social", campaign: "profile_bio" },
  { label: "YouTube", source: "youtube", medium: "video", campaign: "description" },
  { label: "Newsletter", source: "newsletter", medium: "email", campaign: "weekly_issue" },
];

function parseUtmFromUrl(rawUrl: string): { source: string; medium: string; campaign: string } {
  try {
    const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(normalized);
    return {
      source: parsed.searchParams.get("utm_source") || "",
      medium: parsed.searchParams.get("utm_medium") || "",
      campaign: parsed.searchParams.get("utm_campaign") || "",
    };
  } catch {
    return { source: "", medium: "", campaign: "" };
  }
}

function buildUrlWithUtm(rawUrl: string, source: string, medium: string, campaign: string): string {
  if (!rawUrl.trim()) return rawUrl;
  try {
    const hasProto = rawUrl.startsWith("http://") || rawUrl.startsWith("https://");
    const parsed = new URL(hasProto ? rawUrl : `https://${rawUrl}`);
    const assignOrDelete = (key: string, val: string) => {
      if (val.trim()) parsed.searchParams.set(key, val.trim());
      else parsed.searchParams.delete(key);
    };
    assignOrDelete("utm_source", source);
    assignOrDelete("utm_medium", medium);
    assignOrDelete("utm_campaign", campaign);
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function AddEditLinkForm({
  onClose,
  onSave,
  initialItem,
  defaultType,
  userPlanCode,
}: FormInnerProps) {
  const isFreeTier = !userPlanCode || userPlanCode === "FREE";
  const isEnterpriseTier = userPlanCode === "ENTERPRISE";

  const [type, setType] = useState<"LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE" | "EMBED">(
    initialItem?.type ?? defaultType
  );
  const [title, setTitle] = useState(
    initialItem?.title ?? (defaultType === "DONATION" ? "Buy Me a Coffee ☕" : defaultType === "NOTE" ? "Important Note 📝" : "")
  );
  const [url, setUrl] = useState(initialItem?.type === "NOTE" ? "" : (initialItem?.url ?? ""));
  const [noteContent, setNoteContent] = useState(
    initialItem?.content ?? (initialItem?.type === "NOTE" && initialItem.url !== "#" ? initialItem.url : "")
  );
  const [embedDisplayMode, setEmbedDisplayMode] = useState<"inline" | "collapsible">(() =>
    parseEmbedDisplayMode(initialItem?.content)
  );
  const [isFeatured, setIsFeatured] = useState(initialItem?.isFeatured ?? false);
  const [selectedIcon, setSelectedIcon] = useState<string>(() => {
    if (initialItem?.thumbnailUrl?.startsWith("icon:")) {
      return initialItem.thumbnailUrl.replace(/^icon:/, "");
    }
    return "auto";
  });
  const [badge, setBadge] = useState(
    initialItem?.badge ?? (defaultType === "DONATION" ? "☕ $3 Coffee" : defaultType === "NOTE" ? "📝 Note" : "")
  );
  const [isActive, setIsActive] = useState(initialItem?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(
    initialItem?.startsAt ? new Date(initialItem.startsAt).toISOString().slice(0, 16) : ""
  );
  const [expiresAt, setExpiresAt] = useState(
    initialItem?.expiresAt ? new Date(initialItem.expiresAt).toISOString().slice(0, 16) : ""
  );
  const [isPasswordProtected, setIsPasswordProtected] = useState(
    initialItem?.isPasswordProtected ?? false
  );
  const [password, setPassword] = useState(initialItem?.password ?? "");
  const [isAgeRestricted, setIsAgeRestricted] = useState(
    initialItem?.isAgeRestricted ?? false
  );
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      initialItem?.startsAt ||
        initialItem?.expiresAt ||
        initialItem?.isPasswordProtected ||
        initialItem?.isAgeRestricted
    )
  );
  const initialUtm = parseUtmFromUrl(initialItem?.url ?? "");
  const [showUtmBuilder, setShowUtmBuilder] = useState(
    Boolean(initialUtm.source || initialUtm.medium || initialUtm.campaign)
  );
  const [utmSource, setUtmSource] = useState(initialUtm.source);
  const [utmMedium, setUtmMedium] = useState(initialUtm.medium);
  const [utmCampaign, setUtmCampaign] = useState(initialUtm.campaign);
  const [fetchedThumbnail, setFetchedThumbnail] = useState<string | null>(
    initialItem?.thumbnailUrl?.startsWith("http") ? initialItem.thumbnailUrl : null
  );
  const [isExtractingMeta, setIsExtractingMeta] = useState(false);
  const [metaHint, setMetaHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUrlInputChange = (nextUrl: string) => {
    setUrl(nextUrl);
    setMetaHint(null);
    const parsed = parseUtmFromUrl(nextUrl);
    setUtmSource(parsed.source);
    setUtmMedium(parsed.medium);
    setUtmCampaign(parsed.campaign);
  };

  const handleUtmChange = (nextSource: string, nextMedium: string, nextCampaign: string) => {
    setUtmSource(nextSource);
    setUtmMedium(nextMedium);
    setUtmCampaign(nextCampaign);
    if (isValidWebUrl(url)) {
      setUrl(buildUrlWithUtm(url, nextSource, nextMedium, nextCampaign));
    }
  };

  const handleAutoFillMetadata = async () => {
    if (!isValidWebUrl(url)) {
      setMetaHint("Enter a valid destination URL first.");
      return;
    }
    setIsExtractingMeta(true);
    setMetaHint(null);
    try {
      const meta = await apiExtractUrlMetadata(url.trim());
      if (meta.title) {
        setTitle(meta.title);
      }
      if (meta.imageUrl) {
        setFetchedThumbnail(meta.imageUrl);
      }
      if (meta.title || meta.imageUrl) {
        setMetaHint("Metadata imported from destination page.");
      } else {
        setMetaHint("No OpenGraph tags returned; you can enter title manually.");
      }
    } catch (err: unknown) {
      setMetaHint(err instanceof Error ? err.message : "Could not extract page metadata.");
    } finally {
      setIsExtractingMeta(false);
    }
  };

  const applyTipPreset = (preset: (typeof TIP_PRESETS)[0]) => {
    setTitle(preset.defaultTitle);
    if (!url || url === "https://") {
      setUrl(preset.urlTemplate);
    }
    setBadge(preset.defaultBadge);
    setSelectedIcon("coffee");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (type !== "DIVIDER" && !title.trim()) {
      setError("Title is required.");
      return;
    }
    if (type === "NOTE" && !noteContent.trim()) {
      setError("Please write some message or text content for your note.");
      return;
    }
    if (type === "LINK" || type === "DONATION" || type === "EMBED") {
      if (!url.trim()) {
        setError("URL is required.");
        return;
      }
      if (!isValidWebUrl(url)) {
        setError(
          "Please enter a valid web URL with a domain (e.g. https://example.com or youtube.com/@channel). Plain text is not allowed."
        );
        return;
      }
    }

    if (isPasswordProtected && isEnterpriseTier && !password.trim()) {
      setError("Please specify an access PIN or password for protected content.");
      return;
    }

    const formattedUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;

    const computedThumbnailUrl =
      selectedIcon === "auto"
        ? fetchedThumbnail
        : `icon:${selectedIcon}`;

    try {
      setIsSubmitting(true);
      await onSave({
        id: initialItem?.id,
        title: type === "DIVIDER" ? "Divider" : title.trim(),
        url: type === "LINK" || type === "DONATION" || type === "EMBED" ? formattedUrl : "#",
        content: type === "NOTE" ? noteContent.trim() : type === "EMBED" ? embedDisplayMode : undefined,
        type,
        isActive,
        isFeatured: type === "LINK" || type === "DONATION" || type === "EMBED" ? isFeatured : false,
        thumbnailUrl: computedThumbnailUrl,
        badge: badge.trim() || undefined,
        startsAt: !isFreeTier && startsAt ? new Date(startsAt).toISOString() : null,
        expiresAt: !isFreeTier && expiresAt ? new Date(expiresAt).toISOString() : null,
        isPasswordProtected: isEnterpriseTier ? isPasswordProtected : false,
        password: isEnterpriseTier && isPasswordProtected ? password.trim() : null,
        isAgeRestricted: isEnterpriseTier ? isAgeRestricted : false,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save link item.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-[#121215] border border-white/10 rounded-2xl p-6 shadow-2xl relative text-zinc-100 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-zinc-300" />
          <h2 className="text-lg font-semibold tracking-tight text-white">
            {initialItem ? "Edit Content Item" : "Add Content Item"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Type Selector */}
      {!initialItem && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-5">
          <button
            type="button"
            onClick={() => {
              setType("LINK");
              if (title === "Buy Me a Coffee ☕" || title === "Important Note 📝") setTitle("");
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              type === "LINK"
                ? "bg-white text-zinc-950 border-white font-semibold shadow"
                : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType("EMBED");
              if (title === "Buy Me a Coffee ☕" || title === "Important Note 📝") setTitle("");
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              type === "EMBED"
                ? "bg-sky-400 text-zinc-950 border-sky-400 font-semibold shadow"
                : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Media Embed</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType("HEADER");
              if (title === "Buy Me a Coffee ☕" || title === "Important Note 📝") setTitle("");
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              type === "HEADER"
                ? "bg-white text-zinc-950 border-white font-semibold shadow"
                : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Header</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType("DIVIDER");
              if (title === "Buy Me a Coffee ☕" || title === "Important Note 📝") setTitle("");
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              type === "DIVIDER"
                ? "bg-white text-zinc-950 border-white font-semibold shadow"
                : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Divider</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType("DONATION");
              if (!title || title === "Important Note 📝") setTitle("Buy Me a Coffee ☕");
              if (!badge || badge === "📝 Note") setBadge("☕ $3 Coffee");
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              type === "DONATION"
                ? "bg-amber-400 text-zinc-950 border-amber-400 font-semibold shadow"
                : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Tip / Coffee</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType("NOTE");
              if (!title || title === "Buy Me a Coffee ☕") setTitle("Important Note 📝");
              if (!badge || badge.includes("Coffee")) setBadge("📝 Note");
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              type === "NOTE"
                ? "bg-amber-400 text-zinc-950 border-amber-400 font-semibold shadow"
                : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Note Block</span>
          </button>
        </div>
      )}

      {/* Interactive Rich Media Embed Configuration Block */}
      {type === "EMBED" && (
        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-3 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-sky-300 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Interactive Embed (YouTube, Spotify, GitHub)</span>
            </span>
            {url.trim() && (
              <span className="px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 text-[10px] font-mono uppercase">
                {parseEmbedUrl(url).provider}
              </span>
            )}
          </div>
          <p className="text-[11px] text-sky-200/80 leading-relaxed">
            Paste a YouTube video/short, Spotify track/playlist, or GitHub repository URL. Choose whether visitors see it expanded immediately or toggle it open on tap.
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setEmbedDisplayMode("collapsible")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                embedDisplayMode === "collapsible"
                  ? "bg-white text-zinc-950 border-white font-semibold"
                  : "bg-zinc-900/90 text-zinc-300 border-white/10 hover:text-white"
              }`}
            >
              Collapsible (Tap to Open)
            </button>
            <button
              type="button"
              onClick={() => setEmbedDisplayMode("inline")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                embedDisplayMode === "inline"
                  ? "bg-white text-zinc-950 border-white font-semibold"
                  : "bg-zinc-900/90 text-zinc-300 border-white/10 hover:text-white"
              }`}
            >
              Expanded Inline
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Note / Message Configuration Block */}
      {type === "NOTE" && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-amber-400" />
              <span>Read-Only Note & Announcement Block</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-[10px] font-mono font-bold">
              Interactive Notepad Modal
            </span>
          </div>

          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            Write an announcement, community update, FAQ, or secret promo message. When fans click this item in your bio, it opens an interactive digital notepad reader modal without leaving your profile!
          </p>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Note Message / Multiline Text
            </label>
            <textarea
              rows={4}
              maxLength={5000}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your note, update, shipping FAQ, or discount code here..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-amber-500/30 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-sans leading-relaxed"
            />
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mt-1">
              <span>{noteContent.split(/\s+/).filter(Boolean).length} words</span>
              <span>{noteContent.length} / 5000 characters</span>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Tip / Coffee Configuration Block */}
      {type === "DONATION" && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-400" />
              <span>Direct Fan Monetization Block</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-[10px] font-mono font-bold">
              0% Fee on Pro ($2/mo)
            </span>
          </div>

          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            Select your donation provider to prefill settings, or paste any custom payment link below. Fans see a warm, highlighted tipping pill in your bio.
          </p>

          {/* Quick Provider Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            {TIP_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyTipPreset(p)}
                className="px-2 py-1.5 rounded-lg bg-zinc-900/90 border border-amber-500/20 hover:border-amber-400 text-amber-200 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <span>{p.icon}</span>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        {error && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 shadow-lg ${
              error.toLowerCase().includes("sentinel") ||
              error.toLowerCase().includes("blocked") ||
              error.toLowerCase().includes("malicious") ||
              error.toLowerCase().includes("phishing")
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-200"
            }`}
          >
            {error.toLowerCase().includes("sentinel") ||
            error.toLowerCase().includes("blocked") ||
            error.toLowerCase().includes("malicious") ||
            error.toLowerCase().includes("phishing") ? (
              <>
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <span className="font-semibold text-rose-200 block">Security Alert / OneLink Sentinel AI</span>
                  <p className="leading-relaxed font-mono text-[11px] text-rose-300">{error}</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <span className="font-semibold text-amber-200 block">Input Validation Notice</span>
                  <p className="leading-relaxed font-mono text-[11px] text-amber-100">{error}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Visual Icon Picker Strip (Prominently Visible at Top of Form) */}
        {(type === "LINK" || type === "DONATION") && (
          <div className="p-3 rounded-xl bg-zinc-900/90 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase text-zinc-300 flex items-center gap-1.5 font-semibold">
                <span>Visual Link Icon</span>
                <span className="text-zinc-500 font-normal">({selectedIcon === "auto" ? "Auto-detected" : selectedIcon})</span>
              </label>
              <button
                type="button"
                onClick={() => setSelectedIcon("auto")}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer font-mono ${
                  selectedIcon === "auto"
                    ? "bg-white text-zinc-950 border-white font-semibold shadow"
                    : "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Auto from URL
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 max-h-36 overflow-y-auto p-1 bg-black/40 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => setSelectedIcon("auto")}
                className={`p-2 rounded-lg border text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  selectedIcon === "auto"
                    ? "bg-white text-zinc-950 border-white font-semibold shadow"
                    : "bg-zinc-900/80 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
                title="Auto-detect icon based on destination domain"
              >
                <Globe className="w-4 h-4" />
                <span className="text-[10px] truncate max-w-14">Auto</span>
              </button>
              {AVAILABLE_LINK_ICONS.map((opt) => {
                const IconComp = opt.icon;
                const isSelected = selectedIcon === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedIcon(opt.id)}
                    className={`p-2 rounded-lg border text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white text-zinc-950 border-white font-semibold shadow"
                        : "bg-zinc-900/80 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                    title={opt.label}
                  >
                    <IconComp className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-14">
                      {opt.label.split("/")[0].trim()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {type !== "DIVIDER" && (
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
              {type === "HEADER"
                ? "Header Text"
                : type === "DONATION"
                ? "Tip Block Label / Title"
                : type === "NOTE"
                ? "Note Title / Announcement Header"
                : type === "EMBED"
                ? "Embed Card Title"
                : "Link Title"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "HEADER"
                  ? "e.g. COURSES & NEWSLETTERS"
                  : type === "DONATION"
                  ? "Buy Me a Coffee ☕"
                  : type === "NOTE"
                  ? "e.g. Special Community Note 📝"
                  : type === "EMBED"
                  ? "e.g. Featured Repo / Video"
                  : "e.g. Free System Design Architecture Guide"
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-400 transition-colors"
              autoFocus
            />
          </div>
        )}

        {(type === "LINK" || type === "DONATION" || type === "EMBED") && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono uppercase text-zinc-400">
                  {type === "DONATION"
                    ? "Payment or Tip Link (Stripe, Ko-fi, PayPal, Buymeacoffee)"
                    : type === "EMBED"
                    ? "YouTube, Spotify, or GitHub Repo URL"
                    : "Destination URL"}
                </label>
                <button
                  type="button"
                  onClick={handleAutoFillMetadata}
                  disabled={isExtractingMeta || !isValidWebUrl(url)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-[11px] font-mono text-zinc-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Auto-fill link title and preview image from OpenGraph metadata"
                >
                  {isExtractingMeta ? (
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                  )}
                  <span>{isExtractingMeta ? "Scanning..." : "Auto-fill"}</span>
                </button>
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlInputChange(e.target.value)}
                placeholder={
                  type === "DONATION"
                    ? "https://buymeacoffee.com/yourhandle or https://buy.stripe.com/..."
                    : "https://youtube.com/watch?v=..."
                }
                className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border text-white placeholder-zinc-500 text-sm font-mono focus:outline-none transition-colors ${
                  url.trim() && !isValidWebUrl(url)
                    ? "border-amber-500/60 focus:border-amber-500"
                    : "border-white/10 focus:border-zinc-400"
                }`}
              />
              {metaHint && (
                <p className="mt-1.5 text-[11px] font-mono text-emerald-400/90">
                  {metaHint}
                </p>
              )}
              {url.trim() && !isValidWebUrl(url) && (
                <p className="mt-1.5 text-xs text-amber-400/90 flex items-center gap-1.5 font-mono">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Must be a valid web link with a domain (e.g. example.com or https://...). Plain text is not allowed.
                </p>
              )}
            </div>

            {type === "LINK" && (
              <div className="rounded-xl bg-zinc-900/60 border border-white/5 px-3.5 py-2">
                <button
                  type="button"
                  onClick={() => setShowUtmBuilder(!showUtmBuilder)}
                  className="w-full py-1 flex items-center justify-between text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Tags className="w-3.5 h-3.5 text-emerald-400" />
                    <span>UTM Campaign Builder</span>
                  </span>
                  {showUtmBuilder ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showUtmBuilder && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-2.5 text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      {UTM_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleUtmChange(preset.source, preset.medium, preset.campaign)}
                          className="px-2 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-[10px] font-mono text-zinc-300 cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={utmSource}
                        onChange={(e) => handleUtmChange(e.target.value, utmMedium, utmCampaign)}
                        placeholder="utm_source"
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-white text-[11px] font-mono focus:outline-none focus:border-zinc-400"
                      />
                      <input
                        type="text"
                        value={utmMedium}
                        onChange={(e) => handleUtmChange(utmSource, e.target.value, utmCampaign)}
                        placeholder="utm_medium"
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-white text-[11px] font-mono focus:outline-none focus:border-zinc-400"
                      />
                      <input
                        type="text"
                        value={utmCampaign}
                        onChange={(e) => handleUtmChange(utmSource, utmMedium, e.target.value)}
                        placeholder="utm_campaign"
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-white text-[11px] font-mono focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono uppercase text-zinc-400">
                  {type === "DONATION" ? "Suggested Amount or Badge" : "Badge Pill (Optional)"}
                </label>
                {type === "DONATION" && (
                  <div className="flex items-center gap-1">
                    {SUGGESTED_TIP_BADGES.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBadge(b)}
                        className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 border border-white/5 cursor-pointer"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder={type === "DONATION" ? "e.g. ☕ $3 Coffee" : "e.g. NEW, 50% OFF, LIVE"}
                maxLength={16}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
          </>
        )}

        {/* Collapsible Advanced Section: Scheduling & Restrictions */}
        <div className="pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-2 flex items-center justify-between text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Advanced Scheduling &amp; Security Gates</span>
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs">
              {/* Scheduling Group (Creator Pro) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Link Scheduling</span>
                  </span>
                  {isFreeTier && (
                    <Link
                      href="/studio/billing"
                      className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-mono text-blue-300 hover:bg-blue-500/20 transition-all flex items-center gap-1"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>Requires Creator Pro ($2/mo)</span>
                    </Link>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 mb-2.5">
                  Set exact start and expiration timestamps for product launches, limited discounts, or livestream countdowns.
                </p>

                {isFreeTier ? (
                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-white/5 text-zinc-400 text-[11px] flex items-center justify-between">
                    <span>Scheduling is locked on the Free tier.</span>
                    <Link
                      href="/studio/billing"
                      className="font-semibold text-blue-400 hover:text-blue-300 underline"
                    >
                      Upgrade for $2/mo →
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        Start Date &amp; Time
                      </label>
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        Expiration Date &amp; Time
                      </label>
                      <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Password Protection & Age Gate Group (Enterprise Studio) */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Security &amp; Privacy Gates</span>
                  </span>
                  {!isEnterpriseTier && (
                    <Link
                      href="/studio/billing"
                      className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[10px] font-mono text-purple-300 hover:bg-purple-500/20 transition-all flex items-center gap-1"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>Requires Enterprise ($5/mo)</span>
                    </Link>
                  )}
                </div>

                {!isEnterpriseTier ? (
                  <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-white/5 text-zinc-400 text-[11px] flex items-center justify-between">
                    <span>PIN locks and 18+ Verification Gates are exclusive to Enterprise Studio.</span>
                    <Link
                      href="/studio/billing"
                      className="font-semibold text-purple-400 hover:text-purple-300 underline"
                    >
                      Upgrade for $5/mo →
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Password Protection Switch */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPasswordProtected}
                          onChange={(e) => setIsPasswordProtected(e.target.checked)}
                          className="rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-0"
                        />
                        <span className="text-zinc-300 font-medium">
                          Protect with PIN Code or Password
                        </span>
                      </label>
                      {isPasswordProtected && (
                        <input
                          type="text"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter access PIN or password (e.g. 4892)"
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-purple-500/30 text-white text-xs font-mono focus:outline-none focus:border-purple-400"
                        />
                      )}
                    </div>

                    {/* Age Gate Switch */}
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAgeRestricted}
                        onChange={(e) => setIsAgeRestricted(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-0"
                      />
                      <span className="text-zinc-300 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        <span>Age Restriction (18+ Verification Gate)</span>
                      </span>
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Spotlight / Featured Toggle */}
        {(type === "LINK" || type === "DONATION" || type === "EMBED") && (
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs text-zinc-200 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Spotlight Highlight</span>
              </span>
              <span className="text-[11px] text-zinc-500">Accentuate this link on your public profile</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isFeatured}
              onClick={() => setIsFeatured(!isFeatured)}
              className={`relative inline-flex items-center w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${
                isFeatured ? "bg-amber-400" : "bg-zinc-700"
              }`}
            >
              <span
                className={`switch-knob inline-block w-4 h-4 rounded-full shadow-sm transition-transform ${
                  isFeatured ? "translate-x-5 bg-black" : "translate-x-0 bg-zinc-300"
                }`}
              />
            </button>
          </div>
        )}

        {/* Publish Immediately Switch */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-400">Publish immediately (Active)</span>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex items-center w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${
              isActive ? "bg-white" : "bg-zinc-700"
            }`}
          >
            <span
              className={`switch-knob inline-block w-4 h-4 rounded-full shadow-sm transition-transform ${
                isActive ? "translate-x-5 bg-black" : "translate-x-0 bg-zinc-300"
              }`}
            />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-5 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all active:scale-95 shadow-md flex items-center space-x-1.5 ${
              isSubmitting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Checking & Saving...</span>
              </>
            ) : initialItem ? (
              <span>Save Changes</span>
            ) : (
              <span>Add to Bio</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AddEditLinkModal({
  isOpen,
  onClose,
  onSave,
  initialItem,
  defaultType = "LINK",
  userPlanCode = "FREE",
}: AddEditLinkModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initialItem ? "Edit Content Item" : "Add Content Item"}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
        <AddEditLinkForm
          key={initialItem?.id ?? defaultType}
          onClose={onClose}
          onSave={onSave}
          initialItem={initialItem}
          defaultType={defaultType}
          userPlanCode={userPlanCode}
        />
      </div>
    </div>
  );
}
