import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The free episode's playback URL, fetched from the course API on the server.
 *
 * The homepage popup and /watch both show this episode, and neither should be
 * one cross-origin request away from an error message: this is the most-seen
 * page on the site, and the course API is a separate service that can be
 * restarting, redeploying, or briefly unreachable.
 *
 * Going through here buys three things the direct call didn't have — one
 * upstream request per cache window instead of one per visitor, no CORS in the
 * path, and a last-known-good URL to fall back on while the API is down.
 */

const MAX_CACHE_MS = 30 * 60 * 1000;

/** Leaves room to start playing before the signature runs out — a URL handed
 *  out with seconds left would fail mid-load. */
const EXPIRY_MARGIN_SECONDS = 300;

type FreeEpisode = {
  episodeId?: string;
  title?: unknown;
  sources?: Record<string, { url: string; durationSec: number }>;
  expiresIn?: number;
};

/** Module-level, so it lives as long as the server process. Per-instance
 *  rather than shared, which is fine: the worst case is each instance making
 *  its own upstream call once an hour. */
let cached: { body: FreeEpisode; fetchedAt: number; expiresIn: number } | null = null;

export async function GET() {
  const baseUrl = process.env.ACADEMY_API_URL?.replace(/\/$/, "");
  const now = Date.now();

  // Held for half the signature's life, capped — never long enough to hand
  // out a URL with only seconds left on it.
  if (cached && now - cached.fetchedAt < Math.min(MAX_CACHE_MS, (cached.expiresIn / 2) * 1000)) {
    return NextResponse.json(cached.body);
  }

  if (baseUrl) {
    try {
      const response = await fetch(`${baseUrl}/episodes/free`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const body = (await response.json()) as FreeEpisode;
        if (body.sources && Object.keys(body.sources).length) {
          cached = { body, fetchedAt: now, expiresIn: Number(body.expiresIn) || 3_600 };
          return NextResponse.json(body);
        }
      }
      console.error(`[episode/free] course API answered ${response.status}`);
    } catch (err) {
      console.error("[episode/free] could not reach the course API", err);
    }
  } else {
    console.info("[episode/free] ACADEMY_API_URL is not set");
  }

  // Upstream is unhappy. Keep serving the last URL we were given for as long as
  // its signature is good — a visitor watching the free episode shouldn't
  // notice a backend restart.
  if (cached && now - cached.fetchedAt < (cached.expiresIn - EXPIRY_MARGIN_SECONDS) * 1000) {
    return NextResponse.json(cached.body);
  }

  return NextResponse.json({ error: "The episode is not available right now." }, { status: 503 });
}

