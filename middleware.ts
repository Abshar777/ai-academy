import { NextResponse, type NextRequest } from "next/server";

/**
 * Detects the visitor's country for country-aware pricing (India → INR/
 * Razorpay, everywhere else → AED/Tabby/Tamara/Razorpay) and writes it to a
 * cookie that both /order and the in-chat enrol form read.
 *
 * `x-vercel-ip-country` is set by Vercel's edge network. This site is served
 * by nginx on a VPS, so the header never arrives and this does nothing today
 * — it is kept for the day the site moves behind an edge that does set one
 * (Cloudflare's CF-IPCountry would slot in here too). Country is decided in
 * the browser meanwhile: see lib/country-from-timezone.ts.
 *
 * Only ever sets the cookie if it isn't already there, so a manual override
 * made on /order is never clobbered by a later visit to some other page.
 *
 * Runs on every route (not just /order) since the chat widget — and with it
 * the enrol form — lives in the root layout and renders everywhere.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Only when there is something to write. This used to set the cookie to
  // whatever the header held — which, off Vercel, is the empty string. An
  // empty country reads as India, and because the cookie then existed nothing
  // ever tried again: every visitor was quoted INR and pinned there for a
  // month. Writing nothing leaves the browser to work it out instead, from its
  // own timezone (lib/country-from-timezone.ts).
  const detected = request.headers.get("x-vercel-ip-country")?.trim() ?? "";
  if (detected && !request.cookies.has("country")) {
    response.cookies.set("country", detected, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return response;
}

export const config = {
  // Everything except static assets and image/metadata routes — no point
  // running on those, and /icon.png etc. aren't real pages.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image|twitter-image|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};
