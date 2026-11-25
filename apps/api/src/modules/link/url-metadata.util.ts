import { BadRequestException } from '@nestjs/common';
import * as dns from 'node:dns';
import * as net from 'node:net';

export interface UrlMetadataResult {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

const MAX_HTML_BYTES = 256 * 1024;
const REQUEST_TIMEOUT_MS = 3500;
const MAX_REDIRECTS = 2;

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return null;
  }
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true;
  const first = (n >>> 24) & 0xff;
  const second = (n >>> 16) & 0xff;

  if (first === 0) return true; // 0.0.0.0/8
  if (first === 10) return true; // 10.0.0.0/8
  if (first === 100 && second >= 64 && second <= 127) return true; // 100.64.0.0/10 CGNAT
  if (first === 127) return true; // 127.0.0.0/8 loopback
  if (first === 169 && second === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
  if (first === 172 && second >= 16 && second <= 31) return true; // 172.16.0.0/12
  if (first === 192 && second === 168) return true; // 192.168.0.0/16
  if (first >= 224) return true; // Multicast & reserved
  return false;
}

/**
 * Checks whether an IPv4 or IPv6 address belongs to a loopback, private, link-local,
 * or metadata address range to mitigate SSRF attacks.
 */
export function isBlockedIpAddress(rawIp: string): boolean {
  const ip = rawIp.trim().toLowerCase();
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateIpv4(ip);
  }
  if (version === 6) {
    if (ip === '::' || ip === '::1') return true;
    if (ip.startsWith('::ffff:')) {
      const mappedV4 = ip.slice('::ffff:'.length);
      if (net.isIP(mappedV4) === 4) return isPrivateIpv4(mappedV4);
      return true;
    }
    const firstWord = parseInt(ip.split(':')[0] || '0', 16);
    // fc00::/7 Unique Local IPv6, fe80::/10 Link-Local IPv6, ff00::/8 Multicast
    if ((firstWord & 0xfe00) === 0xfc00) return true;
    if ((firstWord & 0xffc0) === 0xfe80) return true;
    if ((firstWord & 0xff00) === 0xff00) return true;
    return false;
  }
  return true;
}

/**
 * Validates that a destination URL resolves exclusively to public internet IPs.
 */
export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  const normalized =
    rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new BadRequestException('Invalid URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Only HTTP and HTTPS URLs are permitted.');
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    throw new BadRequestException('Local or internal hostnames are not permitted.');
  }

  if (net.isIP(host) !== 0) {
    if (isBlockedIpAddress(host)) {
      throw new BadRequestException('Private or loopback IP addresses are blocked.');
    }
    return parsed;
  }

  let resolved: dns.LookupAddress[];
  try {
    resolved = await dns.promises.lookup(host, { all: true });
  } catch {
    throw new BadRequestException('Target domain could not be resolved.');
  }

  if (!resolved || resolved.length === 0 || resolved.some((entry) => isBlockedIpAddress(entry.address))) {
    throw new BadRequestException('Destination resolves to a restricted network address.');
  }

  return parsed;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .trim();
}

function extractMetaContent(html: string, keys: string[]): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const propMatch = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i);
    if (!propMatch) continue;
    const key = propMatch[1].toLowerCase().trim();
    if (!keys.includes(key)) continue;
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (contentMatch && contentMatch[1].trim()) {
      return decodeHtmlEntities(contentMatch[1].trim());
    }
  }
  return null;
}

/**
 * Extracts OpenGraph/Twitter/HTML title, description, and image from raw HTML.
 */
export function parseHtmlMetadata(html: string, baseUrl: string): UrlMetadataResult {
  const ogTitle = extractMetaContent(html, ['og:title', 'twitter:title']);
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const htmlTitle = titleTagMatch ? decodeHtmlEntities(titleTagMatch[1].replace(/\s+/g, ' ')) : null;
  const title = ogTitle || htmlTitle || null;

  const description = extractMetaContent(html, ['og:description', 'twitter:description', 'description']);
  const rawImage = extractMetaContent(html, ['og:image', 'twitter:image', 'og:image:url']);

  let imageUrl: string | null = null;
  if (rawImage) {
    try {
      const resolvedImg = new URL(rawImage, baseUrl);
      if (resolvedImg.protocol === 'http:' || resolvedImg.protocol === 'https:') {
        imageUrl = resolvedImg.toString();
      }
    } catch {
      imageUrl = null;
    }
  }

  return {
    title: title ? title.slice(0, 200) : null,
    description: description ? description.slice(0, 320) : null,
    imageUrl,
  };
}

async function readBoundedHtml(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const remaining = MAX_HTML_BYTES - total;
    if (value.byteLength >= remaining) {
      chunks.push(value.subarray(0, remaining));
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks));
}

/**
 * Fetches OpenGraph metadata safely with strict SSRF validation, manual redirect checks,
 * bounded response reads, and short timeouts.
 */
export async function fetchUrlMetadata(rawUrl: string): Promise<UrlMetadataResult> {
  let currentUrl = await assertSafePublicUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(currentUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'OneLinkBot/1.2 (+https://github.com/cristianarando/onelink-saas)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        await res.body?.cancel().catch(() => {});
        if (!location || hop === MAX_REDIRECTS) {
          return { title: null, description: null, imageUrl: null };
        }
        const nextUrl = new URL(location, currentUrl).toString();
        currentUrl = await assertSafePublicUrl(nextUrl);
        continue;
      }

      if (!res.ok) {
        return { title: null, description: null, imageUrl: null };
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        return { title: null, description: null, imageUrl: null };
      }

      const html = await readBoundedHtml(res);
      return parseHtmlMetadata(html, currentUrl.toString());
    } finally {
      clearTimeout(timer);
    }
  }

  return { title: null, description: null, imageUrl: null };
}
