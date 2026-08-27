import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";
import { db } from "@/lib/db";

const BASE_URL = `https://${SITE.domain}`;

type ArchiveDay = { day: string };

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL, changeFrequency: "hourly", priority: 1 },
  { url: `${BASE_URL}/archive`, changeFrequency: "daily", priority: 0.7 },
  { url: `${BASE_URL}/browse`, changeFrequency: "daily", priority: 0.8 },
  { url: `${BASE_URL}/categories`, changeFrequency: "daily", priority: 0.8 },
  { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
  { url: `${BASE_URL}/rules`, changeFrequency: "monthly", priority: 0.4 },
  { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  { url: `${BASE_URL}/stats`, changeFrequency: "daily", priority: 0.5 },
  { url: `${BASE_URL}/submit`, changeFrequency: "monthly", priority: 0.5 },
];

/**
 * Every archived day is a real, permanent page — worth indexing even after
 * the board that produced it is long cleared. A database blip here should
 * never take the whole sitemap down with it, so this falls back to just the
 * static routes rather than failing the request.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const { data } = await db()
      .from("archive_days")
      .select("day")
      .order("day", { ascending: false })
      .limit(500)
      .returns<ArchiveDay[]>();

    const days = (data ?? []).map((d) => ({
      url: `${BASE_URL}/archive/${d.day}`,
      lastModified: new Date(d.day + "T00:00:00Z"),
      changeFrequency: "never" as const,
      priority: 0.4,
    }));

    return [...STATIC_ROUTES, ...days];
  } catch (err) {
    console.error("sitemap: archive_days unavailable", err);
    return STATIC_ROUTES;
  }
}
