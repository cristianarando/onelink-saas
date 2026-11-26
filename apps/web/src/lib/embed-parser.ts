/**
 * Embed URL Parser for YouTube, Spotify, and GitHub Repositories.
 * Enables rich, privacy-friendly embedded media blocks without storing remote assets.
 */

export type ParsedEmbed =
  | {
      provider: "youtube";
      videoId: string;
      embedUrl: string;
      thumbnailUrl: string;
      originalUrl: string;
    }
  | {
      provider: "spotify";
      kind: "track" | "album" | "playlist" | "episode" | "show";
      spotifyId: string;
      embedUrl: string;
      compact: boolean;
      originalUrl: string;
    }
  | {
      provider: "github";
      owner: string;
      repo: string;
      repoUrl: string;
    }
  | {
      provider: "generic";
      url: string;
    };

const GITHUB_RESERVED = new Set([
  "orgs",
  "settings",
  "topics",
  "trending",
  "explore",
  "marketplace",
  "features",
  "enterprise",
  "pricing",
  "login",
  "signup",
  "about",
  "sponsors",
]);

export function parseEmbedDisplayMode(content?: string | null): "inline" | "collapsible" {
  return content?.trim().toLowerCase() === "inline" ? "inline" : "collapsible";
}

/**
 * Formats remaining time before an expiration timestamp (returns null if expired, >14d away, or unmounted).
 */
export function formatExpirationCountdown(
  expiresAt?: string | null,
  nowMs?: number | null
): string | null {
  if (!expiresAt || nowMs == null) return null;
  const endMs = new Date(expiresAt).getTime();
  if (Number.isNaN(endMs)) return null;
  const diffMs = endMs - nowMs;
  if (diffMs <= 0 || diffMs > 14 * 24 * 60 * 60 * 1000) return null;

  const totalMinutes = Math.max(1, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export function parseEmbedUrl(rawUrl?: string | null): ParsedEmbed {
  const cleaned = (rawUrl || "").trim();
  if (!cleaned) {
    return { provider: "generic", url: "#" };
  }

  const normalized =
    cleaned.startsWith("http://") || cleaned.startsWith("https://")
      ? cleaned
      : `https://${cleaned}`;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    // 1. YouTube (watch, youtu.be, shorts, embed)
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      let videoId = "";
      if (host === "youtu.be") {
        videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
      } else if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v") || "";
      } else {
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length >= 2 && (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live")) {
          videoId = parts[1];
        }
      }

      if (/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
        return {
          provider: "youtube",
          videoId,
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          originalUrl: normalized,
        };
      }
    }

    // 2. Spotify (track, album, playlist, episode, show)
    if (host === "open.spotify.com") {
      const match = parsed.pathname.match(
        /^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/i
      );
      if (match) {
        const kind = match[1].toLowerCase() as "track" | "album" | "playlist" | "episode" | "show";
        const spotifyId = match[2];
        return {
          provider: "spotify",
          kind,
          spotifyId,
          embedUrl: `https://open.spotify.com/embed/${kind}/${spotifyId}?utm_source=generator&theme=0`,
          compact: kind === "track",
          originalUrl: normalized,
        };
      }
    }

    // 3. GitHub Repository Card (github.com/:owner/:repo)
    if (host === "github.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && !GITHUB_RESERVED.has(parts[0].toLowerCase())) {
        const owner = parts[0];
        const repo = parts[1].replace(/\.git$/i, "");
        if (/^[a-zA-Z0-9_.-]+$/.test(owner) && /^[a-zA-Z0-9_.-]+$/.test(repo)) {
          return {
            provider: "github",
            owner,
            repo,
            repoUrl: `https://github.com/${owner}/${repo}`,
          };
        }
      }
    }
  } catch {
    // Fallback below
  }

  return { provider: "generic", url: normalized };
}
