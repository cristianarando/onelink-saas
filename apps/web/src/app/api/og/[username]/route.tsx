import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";

interface OgProfilePayload {
  username?: string;
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  seoTitle?: string | null;
  seoDesc?: string | null;
  theme?: {
    bgType?: string;
    bgValue?: string;
    btnColor?: string;
    textColor?: string;
  } | null;
  customTheme?: {
    bgType?: string;
    bgValue?: string;
    btnColor?: string;
    textColor?: string;
  } | null;
  links?: Array<{ id: string }>;
}

function resolveCardColors(profile: OgProfilePayload | null): {
  bg: string;
  accent: string;
  text: string;
  muted: string;
} {
  const active = profile?.customTheme || profile?.theme;
  const rawBg = active?.bgValue?.trim() || "#09090b";
  const hexMatch = rawBg.match(/#[0-9a-fA-F]{6}/);
  const bg = rawBg.startsWith("#") ? rawBg : hexMatch ? hexMatch[0] : "#09090b";

  const rawText = active?.textColor?.trim() || "#fafafa";
  const text = rawText.startsWith("#") ? rawText : "#fafafa";

  const rawBtn = active?.btnColor?.trim() || "#27272a";
  const accent = rawBtn.startsWith("#") ? rawBtn : "#38bdf8";

  const isLight =
    bg.toLowerCase() === "#ffffff" ||
    bg.toLowerCase() === "#f8fafc" ||
    bg.toLowerCase() === "#faf8f5" ||
    bg.toLowerCase() === "#f2f5ef" ||
    bg.toLowerCase() === "#fef08a";

  return {
    bg,
    accent,
    text: isLight ? "#09090b" : text,
    muted: isLight ? "#52525b" : "#a1a1aa",
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  const cleanUsername = (username || "creator").replace(/^%40|^@/, "").toLowerCase().trim();

  let profile: OgProfilePayload | null = null;
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/profiles/${encodeURIComponent(cleanUsername)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      profile = (await res.json()) as OgProfilePayload;
    }
  } catch {
    // Graceful fallback if API is unreachable during preview
  }

  const displayName = profile?.seoTitle || profile?.title || `@${cleanUsername}`;
  const rawBio =
    profile?.seoDesc ||
    profile?.bio ||
    `Explore verified links, embeds, and resources from @${cleanUsername} on OneLink.`;
  const bio = rawBio.length > 135 ? `${rawBio.slice(0, 132)}...` : rawBio;
  const linksCount = Array.isArray(profile?.links) ? profile.links.length : 0;

  const avatarUrl = profile?.avatarUrl?.trim() || "";
  const hasSafeRasterAvatar =
    avatarUrl.startsWith("https://") && !avatarUrl.toLowerCase().endsWith(".svg");
  const initial = displayName.replace(/^@/, "").charAt(0).toUpperCase() || "O";

  const palette = resolveCardColors(profile);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          backgroundColor: palette.bg,
          color: palette.text,
          fontFamily: "sans-serif",
          border: `2px solid ${palette.accent}`,
        }}
      >
        {/* Top Row: Brand & Handle Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#fafafa",
                color: "#09090b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "20px",
              }}
            >
              1L
            </div>
            <span style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              OneLink
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: "9999px",
              border: "1px solid rgba(161,161,170,0.35)",
              fontSize: "22px",
              color: palette.muted,
            }}
          >
            onelink.bio/{cleanUsername}
          </div>
        </div>

        {/* Center Identity Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "40px",
            width: "100%",
          }}
        >
          {hasSafeRasterAvatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={avatarUrl}
              alt={displayName}
              width={148}
              height={148}
              style={{
                borderRadius: "9999px",
                objectFit: "cover",
                border: `4px solid ${palette.accent}`,
              }}
            />
          ) : (
            <div
              style={{
                width: "148px",
                height: "148px",
                borderRadius: "9999px",
                backgroundColor: palette.accent,
                color: palette.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "64px",
                fontWeight: 800,
              }}
            >
              {initial}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              maxWidth: "820px",
            }}
          >
            <div
              style={{
                fontSize: "54px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: "26px",
                color: palette.muted,
                lineHeight: 1.4,
              }}
            >
              {bio}
            </div>
          </div>
        </div>

        {/* Bottom Metadata Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(161,161,170,0.22)",
            paddingTop: "24px",
            fontSize: "20px",
            color: palette.muted,
          }}
        >
          <span>@{cleanUsername} • Creator Profile</span>
          <span>
            {linksCount > 0 ? `${linksCount} Active Links & Blocks` : "Protected by Sentinel AI"}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
