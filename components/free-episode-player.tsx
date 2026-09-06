"use client";

import { useEffect, useState } from "react";
import { VideoPlayer } from "./video-player";
import { ACADEMY_API_URL } from "@/lib/academy-api";
import type { EpisodeLanguage } from "@/lib/episode";

type Sources = Partial<Record<EpisodeLanguage, string>>;

type FreeEpisodeResponse = {
  sources?: Partial<Record<EpisodeLanguage, { url: string }>>;
};

/**
 * The free episode.
 *
 * The R2 bucket holding every course video is private, so the URLs in
 * lib/episode.ts no longer play on their own — they answer 401. The signed URL
 * comes from the course API instead, with no account needed, because the
 * episode really is free.
 *
 * There is deliberately no fallback to those stored URLs: handing a dead one
 * to the player would show a broken video, which reads as a broken site. If
 * the API can't be reached, this says so instead.
 */
export function FreeEpisodePlayer({ className = "" }: { className?: string }) {
  const [sources, setSources] = useState<Sources | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${ACADEMY_API_URL}/episodes/free`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as FreeEpisodeResponse;
        const resolved: Sources = {};
        for (const [lang, value] of Object.entries(data.sources ?? {})) {
          if (value?.url) resolved[lang as EpisodeLanguage] = value.url;
        }
        if (cancelled) return;
        if (Object.keys(resolved).length) setSources(resolved);
        else setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return <VideoPlayer sources={sources} className={className} />;
}
