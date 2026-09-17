import { getDb } from "./mongodb";
import sanitizeHtml from "sanitize-html";

/**
 * Blog posts for /blog, written in the admin (app/admin/(protected)/blog).
 *
 * Same graceful-degradation contract as lib/coupons.ts: every function returns
 * null when MongoDB isn't configured, so the marketing site keeps rendering
 * without a database rather than failing the whole page for the sake of a blog.
 */

export type BlogPostStatus = "draft" | "published";

export type BlogPost = {
  /** URL segment, unique. Derived from the title but editable, since changing
   *  a title after publication shouldn't silently break the post's URL. */
  slug: string;
  title: string;
  /** Card copy on /blog and the meta description on the post itself. */
  excerpt: string;
  /** Editor output, sanitised on the way in — see sanitizePostHtml. */
  contentHtml: string;
  /** Path under /uploads, or empty when the post has no cover. */
  coverImage?: string;
  status: BlogPostStatus;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  /** Set the first time it's published and then left alone, so re-editing a
   *  live post doesn't reorder the blog or change a date readers have seen. */
  publishedAt?: Date;
};

const COLLECTION = "blog_posts";

let indexesEnsured = false;

async function collection() {
  const db = await getDb();
  if (!db) return null;
  const coll = db.collection<BlogPost>(COLLECTION);
  if (!indexesEnsured) {
    // Unique so two posts can't share a URL. Sorting index matches the only
    // order the public list is ever read in.
    await coll.createIndex({ slug: 1 }, { unique: true });
    await coll.createIndex({ status: 1, publishedAt: -1 });
    indexesEnsured = true;
  }
  return coll;
}

/**
 * What the editor is allowed to produce. An allowlist rather than a blocklist:
 * anything not named here is stripped, so a tag nobody thought about can't
 * arrive through a crafted request to the API. The admin is authenticated, but
 * this output is rendered into every visitor's browser with dangerouslySet-
 * InnerHTML, which is precisely the wrong place to extend trust.
 */
export function sanitizePostHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote",
      "h2", "h3", "h4", "ul", "ol", "li", "a", "img", "hr",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title"],
    },
    // http/https and site-relative only: no javascript:, and no data: URI,
    // which can carry script in an SVG.
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    transformTags: {
      // Anything leaving the site opens away from it and cannot reach back
      // through window.opener.
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        const external = /^https?:\/\//i.test(href);
        return {
          tagName,
          attribs: external
            ? { ...attribs, target: "_blank", rel: "noopener noreferrer" }
            : attribs,
        };
      },
    },
  });
}

/** Title -> URL segment. Trailing/leading dashes trimmed so "AI: what next?"
 *  doesn't become "ai-what-next-". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export type ListPostsOptions = {
  /** Omit for everything (the admin list); "published" for the public one. */
  status?: BlogPostStatus;
  limit?: number;
};

/**
 * Cover images are stored with whatever URL the uploader returned, and the
 * media host hands back `http://…` even though it serves the same file over
 * TLS and 301s the plain request. That URL is mixed content on an https page:
 * browsers block or silently upgrade the <img>, scrapers reading the
 * OpenGraph tag often refuse a redirect, and it lands in the post's structured
 * data as an address Google has to be talked out of.
 *
 * Upgraded on the way out rather than migrated in the database, so existing
 * posts are fixed without a rewrite. Loopback is left alone — a dev server on
 * plain http is the one case where the upgrade would break the image.
 */
function secureMediaUrl(url: string | undefined): string | undefined {
  if (!url?.startsWith("http://")) return url;
  const host = url.slice(7).split("/")[0].split(":")[0];
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return url;
  return `https://${url.slice(7)}`;
}

/** Every read goes through here, so no caller has to remember. */
function readPost<T extends BlogPost | null>(post: T): T {
  if (!post) return post;
  return { ...post, coverImage: secureMediaUrl(post.coverImage) } as T;
}

export async function listPosts(options: ListPostsOptions = {}): Promise<BlogPost[] | null> {
  const coll = await collection();
  if (!coll) return null;
  const filter = options.status ? { status: options.status } : {};
  return coll
    .find(filter, { projection: { _id: 0 } })
    // Drafts have no publishedAt, so they order by when they were last touched
    // — which is the order somebody coming back to unfinished work wants.
    .sort({ publishedAt: -1, updatedAt: -1 })
    .limit(options.limit ?? 200)
    .toArray()
    .then((posts) => posts.map(readPost));
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  const coll = await collection();
  if (!coll) return null;
  return readPost(await coll.findOne({ slug }, { projection: { _id: 0 } }));
}

export type PostInput = {
  title: string;
  slug?: string;
  excerpt: string;
  contentHtml: string;
  coverImage?: string;
  status: BlogPostStatus;
  author?: string;
};

/** Returns null when there's no database, or "duplicate" when the slug is
 *  taken — the caller turns that into a 409 rather than a generic failure. */
export async function createPost(input: PostInput): Promise<BlogPost | "duplicate" | null> {
  const coll = await collection();
  if (!coll) return null;

  const now = new Date();
  const post: BlogPost = {
    slug: input.slug?.trim() || slugify(input.title),
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    contentHtml: sanitizePostHtml(input.contentHtml),
    coverImage: input.coverImage?.trim() || undefined,
    status: input.status,
    author: input.author?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    publishedAt: input.status === "published" ? now : undefined,
  };

  try {
    await coll.insertOne(post);
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) return "duplicate";
    throw err;
  }
  return post;
}

export async function updatePost(
  slug: string,
  patch: Partial<PostInput>,
): Promise<BlogPost | "duplicate" | null> {
  const coll = await collection();
  if (!coll) return null;

  const existing = await coll.findOne({ slug });
  if (!existing) return null;

  const next: Partial<BlogPost> = { updatedAt: new Date() };
  if (patch.title !== undefined) next.title = patch.title.trim();
  if (patch.excerpt !== undefined) next.excerpt = patch.excerpt.trim();
  if (patch.contentHtml !== undefined) next.contentHtml = sanitizePostHtml(patch.contentHtml);
  if (patch.coverImage !== undefined) next.coverImage = patch.coverImage.trim() || undefined;
  if (patch.author !== undefined) next.author = patch.author.trim() || undefined;
  if (patch.slug !== undefined && patch.slug.trim()) next.slug = patch.slug.trim();
  if (patch.status !== undefined) {
    next.status = patch.status;
    // Stamped once, on the first publish. Un-publishing and re-publishing
    // keeps the original date rather than jumping the post back to the top.
    if (patch.status === "published" && !existing.publishedAt) next.publishedAt = new Date();
  }

  try {
    const updated = await coll.findOneAndUpdate(
      { slug },
      { $set: next },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    return updated ?? null;
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) return "duplicate";
    throw err;
  }
}

export async function deletePost(slug: string): Promise<boolean | null> {
  const coll = await collection();
  if (!coll) return null;
  const res = await coll.deleteOne({ slug });
  return res.deletedCount > 0;
}

/** Reading time, rounded up, never zero — from the text the reader actually
 *  sees rather than the markup around it. */
export function readingMinutes(contentHtml: string): number {
  const words = contentHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
