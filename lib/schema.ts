import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

/**
 * The site's structured data, defined once.
 *
 * Every page that describes the organisation used to spell it out again, which
 * is how a site ends up telling Google two different things about itself — a
 * logo here, a different logo there, under no shared identity. Instead the
 * organisation and the website are declared once, each with an `@id`, and
 * everything else refers to those ids rather than repeating them.
 */

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * A plain file under /public, not the Next image optimiser.
 *
 * `/_next/image?url=…&w=3840&q=75` renders the same picture, but as a logo it
 * is a poor address: it is a query string against a build-time endpoint rather
 * than a stable asset, it only answers for widths that happen to be in the
 * optimiser's configured list, and it asks for 3840px of a 1600px wide file.
 * Crawlers want a URL that will still return the image unchanged next year.
 */
export const LOGO_URL = `${SITE_URL}/brand/delta-wordmark.png`;
const LOGO_WIDTH = 1600;
const LOGO_HEIGHT = 604;

export const LANGUAGE = "en-IN";

/** Referred to by `@id` everywhere else, so it is stated in exactly one place. */
export function organizationNode() {
  return {
    "@type": "EducationalOrganization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
      width: LOGO_WIDTH,
      height: LOGO_HEIGHT,
    },
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    publisher: { "@id": ORG_ID },
    inLanguage: LANGUAGE,
  };
}

/** The organisation and the website, for the document that carries them. */
export function siteGraph() {
  return { "@context": "https://schema.org", "@graph": [organizationNode(), websiteNode()] };
}

/**
 * A published post, as the article itself plus its trail back to the blog.
 *
 * URLs carry no trailing slash, because that is what this site serves; a
 * schema pointing at `/blog/x/` would be naming a URL that redirects.
 *
 * The organisation and the website are referred to by `@id` and not repeated:
 * the layout already states them on every page, and saying the same thing
 * twice in one document is only weight.
 */
export function blogPostingGraph(post: {
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  author?: string;
  publishedAt?: Date;
  updatedAt?: Date;
}) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const absolute = (path: string) => (/^https?:\/\//i.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#blogposting`,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        headline: post.title,
        ...(post.excerpt ? { description: post.excerpt } : {}),
        url,
        inLanguage: LANGUAGE,
        isPartOf: { "@id": WEBSITE_ID },
        publisher: { "@id": ORG_ID },
        // A named writer is a person; without one the organisation published it.
        author: post.author ? { "@type": "Person", name: post.author } : { "@id": ORG_ID },
        ...(post.publishedAt ? { datePublished: post.publishedAt.toISOString() } : {}),
        ...(post.updatedAt ? { dateModified: post.updatedAt.toISOString() } : {}),
        // Only when the post actually has a cover — a broken or placeholder
        // image URL is worse than no image property at all.
        ...(post.coverImage
          ? { image: { "@type": "ImageObject", url: absolute(post.coverImage) } }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };
}

/**
 * JSON for a `<script type="application/ld+json">`.
 *
 * The `<` escape is not decoration: a post's title and excerpt come from the
 * database, and one containing `</script>` would close the tag early and leave
 * the remainder to be parsed as markup.
 */
export function ldJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
