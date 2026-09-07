import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Everything public is crawlable; the rest is not worth a crawl budget and
 * some of it shouldn't appear in results at all.
 *
 * The gated pages already carry a noindex in their own metadata — this is the
 * belt to that pair of braces, and it also keeps crawlers off the API, which
 * would otherwise be hit for JSON it can do nothing with.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/learn", "/order"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
