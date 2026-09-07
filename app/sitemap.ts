import type { MetadataRoute } from "next";
import { BROCHURE_HREF, SITE_URL } from "@/lib/site";
import { EPISODE_PAGE_PATH } from "@/lib/episode";

/**
 * Only the pages a search engine should land someone on.
 *
 * Checkout, the course view, the thank-you page and admin are all left out
 * deliberately — they are either gated, transactional, or meaningless without
 * the step before them. app/robots.ts disallows the same set.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/course`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      // The free episode — a real landing page, and the strongest thing to
      // arrive on from a search.
      url: `${SITE_URL}${EPISODE_PAGE_PATH}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}${BROCHURE_HREF}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
