import { NextResponse, type NextRequest } from "next/server";

/**
 * Detects the visitor's country for country-aware pricing (India → INR/
 * Razorpay, everywhere else → AED/Tabby/Tamara/Razorpay) and writes it to a
 * cookie that both /order and the in-chat enrol form read.
 *
 * `x-vercel-ip-country` is set by Vercel's edge network on every deployed
 * request — no API key, no signup, nothing to configure. It's simply absent
 * in local dev (no edge network in front of `next dev`), so both consumers
 * have their own fallback for that case and a manual override either way.
 *
 * Only ever sets the cookie if it isn't already there, so a manual override
 * made on /order is never clobbered by a later visit to some other page.
 *
 * Runs on every route (not just /order) since the chat widget — and with it
 * the enrol form — lives in the root layout and renders everywhere.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.has("country")) {
    const detected = request.headers.get("x-vercel-ip-country") ?? "";
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
