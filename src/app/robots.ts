import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";

/**
 * /manage/[token] carries a secret token in the URL itself — a crawler that
 * indexes it hands the listing away to anyone who searches for it. /dashboard,
 * /api, /signin and /auth are all either equally sensitive or simply useless
 * to a search index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/manage/", "/dashboard/", "/api/", "/signin", "/auth/"],
    },
    sitemap: `https://${SITE.domain}/sitemap.xml`,
  };
}
