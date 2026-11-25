import type { MetadataRoute } from "next";
import { getApiBaseUrl } from "@/lib/api-config";

interface SitemapHandle {
  username: string;
  updatedAt: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://onelink-saas.vercel.app").replace(/\/+$/, "");

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  let dynamicHandles: SitemapHandle[] = [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${getApiBaseUrl()}/api/profiles/sitemap-handles`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        dynamicHandles = data;
      }
    }
  } catch {
    // Graceful fallback when API is offline during static build
  }

  if (dynamicHandles.length === 0) {
    dynamicHandles = [{ username: "crisarando", updatedAt: new Date().toISOString() }];
  }

  const profileEntries: MetadataRoute.Sitemap = dynamicHandles.map((item) => ({
    url: `${baseUrl}/${encodeURIComponent(item.username)}`,
    lastModified: new Date(item.updatedAt || Date.now()),
    changeFrequency: "hourly",
    priority: 0.9,
  }));

  return [...staticEntries, ...profileEntries];
}
