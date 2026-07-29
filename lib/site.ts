/**
 * Single source of truth for the deployed origin, used by metadata, the
 * sitemap and robots.txt so they never disagree with each other.
 *
 * Resolution order: an explicit override, then Vercel's stable production
 * domain, then the current deployment's own URL, then the confirmed live
 * domain as a last resort so local tooling still produces valid absolute
 * URLs. Set NEXT_PUBLIC_SITE_URL once a custom domain is attached.
 */
const VERCEL_PRODUCTION_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

const VERCEL_DEPLOYMENT_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  VERCEL_PRODUCTION_URL ??
  VERCEL_DEPLOYMENT_URL ??
  "https://ai-academy-virid.vercel.app";

export const SITE_NAME = "Delta AI Academy";

export const SITE_DESCRIPTION =
  "Build AI powered applications even if you've never coded before. Learn React, React Native, Python FastAPI and MongoDB with AI tools like Codex, Claude Code and Lovable, and ship four real projects for AED 99.";
