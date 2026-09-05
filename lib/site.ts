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
  "https://www.deltaaiacademy.ai";

export const SITE_NAME = "Delta AI Academy";

/**
 * The programme's product name — what the single paid offering is called on
 * the pricing card, the enrolment bar, the checkout description, the invoice
 * line item and the certificate. Kept here so those never drift apart.
 * Generic prose ("what you build during the programme") deliberately stays
 * lowercase and generic rather than substituting this in.
 */
export const PROGRAMME_NAME = "Master Software Development with AI";

/**
 * Public contact number for the "talk to a mentor", "call now" and footer
 * actions. Digits only, E.164 without the "+", which is the form wa.me
 * expects — the display and link variants are derived from it so they can
 * never disagree.
 *
 * Unrelated to WHATSAPP_ADMIN_PHONE in .env: that one is server-side, for
 * the Cloud API notifications in lib/whatsapp.ts, and is never sent to the
 * browser.
 */
export const CONTACT_PHONE = "918590026442";
export const CONTACT_PHONE_DISPLAY = "+91 85900 26442";
export const CONTACT_CALL_URL = `tel:+${CONTACT_PHONE}`;
export const CONTACT_WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE}`;

/** Deliberately currency-neutral: this is build-time metadata shared by every
 *  visitor, so it can't quote the country-aware price the page itself shows
 *  without making the whole route dynamic. */
export const SITE_DESCRIPTION =
  "Build AI powered applications even if you've never coded before. Learn React, React Native, Python FastAPI and MongoDB with AI tools like Codex, Claude Code and Lovable, and ship four real projects on one all-inclusive plan.";
