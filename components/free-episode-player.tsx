"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VideoPlayer } from "./video-player";
import type { EpisodeLanguage } from "@/lib/episode";

type Sources = Partial<Record<EpisodeLanguage, string>>;

type FreeEpisodeResponse = {
  sources?: Partial<Record<EpisodeLanguage, { url: string }>>;
};

/**
 * The free episode.
 *
 * The R2 bucket holding every course video is private, so the URLs in
 * lib/episode.ts no longer play on their own — they answer 401. A signed URL
 * comes from this site's own /api/episode/free, which fetches and caches it
 * from the course API server-side, so the homepage isn't making a
 * cross-origin call per visitor for something that changes once an hour.
 *
 * There is deliberately no fallback to those stored URLs: handing a dead one
 * to the player would show a broken video, which reads as a broken site. If
 * the API can't be reached, this says so instead.
 */
/** A URL that keeps failing won't be fixed by asking again; two re-mints is
 *  enough to cover an expiry and a hiccup without spinning. */
const MAX_REMINTS = 2;

export function FreeEpisodePlayer({ className = "" }: { className?: string }) {
  const [sources, setSources] = useState<Sources | null>(null);
  const [failed, setFailed] = useState(false);
  const remints = useRef(0);

  const load = useCallback(async () => {
    try {
      // Same-origin: the server fetches and caches it (app/api/episode/free).
      const res = await fetch("/api/episode/free");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as FreeEpisodeResponse;
      const resolved: Sources = {};
      for (const [lang, value] of Object.entries(data.sources ?? {})) {
        if (value?.url) resolved[lang as EpisodeLanguage] = value.url;
      }
      if (Object.keys(resolved).length) setSources(resolved);
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // Deferred a tick — load() sets state once its request resolves, and the
    // lint rule flags a setState the effect body can reach synchronously.
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  if (failed) {
    return (
      <div
        className={`flex aspect-video w-full items-center justify-center rounded-2xl bg-neutral-90 px-6 text-center ${className}`}
      >
        <p className="max-w-xs font-noi-grotesk text-[15px] leading-[1.45] text-white/70">
          The episode couldn&rsquo;t load just now. Refresh the page, or{" "}
          <a href="/order" className="text-lime-30 underline underline-offset-4">
            join the programme
          </a>{" "}
          to watch the rest.
        </p>
      </div>
    );
  }

  if (!sources) {
    return <div className={`aspect-video w-full animate-pulse rounded-2xl bg-neutral-90/10 ${className}`} aria-busy />;
  }

  return (
    <VideoPlayer
      sources={sources}
      className={className}
      onMediaError={() => {
        if (remints.current >= MAX_REMINTS) return setFailed(true);
        remints.current += 1;
        void load();
      }}
    />
  );
}
