"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VideoPlayer } from "@/components/video-player";
import { useAcademyAuth } from "@/components/academy-auth";
import { SignIn } from "./sign-in";
import { LanguageToggle } from "./language-toggle";
import {
  COURSE_SLUG,
  formatDuration,
  localized,
  type CourseResponse,
  type EpisodeSummary,
  type Lang,
  type ModuleSummary,
  type PlayResponse,
} from "@/lib/academy-api";

/** A URL that keeps failing won't be fixed by asking again; two re-mints cover
 *  an expiry and a hiccup without spinning on a genuinely broken file. */
const MAX_REMINTS = 2;

/** Position is written at most this often while playing — often enough that
 *  closing the tab loses seconds, rare enough not to hammer the API. */
const SAVE_EVERY_MS = 15_000;

type Located = {
  module: ModuleSummary;
  episode: EpisodeSummary;
  previous: { href: string; title: string } | null;
  next: { href: string; title: string } | null;
};

function locate(course: CourseResponse, moduleOrder: number, key: string, lang: Lang): Located | null {
  const flat = course.modules.flatMap((module) =>
    module.episodes.map((episode) => ({ module, episode })),
  );
  const index = flat.findIndex(
    (item) => item.module.order + 1 === moduleOrder && item.episode.key === key,
  );
  if (index === -1) return null;

  const at = (i: number) => {
    const item = flat[i];
    if (!item) return null;
    return {
      href: `/learn/${item.module.order + 1}/${item.episode.key}`,
      title: localized(item.episode.title, lang),
    };
  };

  return {
    module: flat[index]!.module,
    episode: flat[index]!.episode,
    // Crosses module boundaries deliberately: "next" should mean the next
    // thing to watch, not stop dead at the end of a module.
    previous: at(index - 1),
    next: at(index + 1),
  };
}

export function EpisodeView({ moduleOrder, episodeKey }: { moduleOrder: number; episodeKey: string }) {
  const { status, user, apiFetch } = useAcademyAuth();
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [play, setPlay] = useState<PlayResponse | null>(null);
  const [blocked, setBlocked] = useState<"none" | "sign-in" | "purchase">("none");
  const [loading, setLoading] = useState(true);
  const [langOverride, setLangOverride] = useState<Lang | null>(null);

  const lang: Lang = langOverride ?? user?.preferredLang ?? "en";
  const located = useMemo(
    () => (course ? locate(course, moduleOrder, episodeKey, lang) : null),
    [course, moduleOrder, episodeKey, lang],
  );

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/courses/${COURSE_SLUG}`);
        if (!cancelled) setCourse(res.ok ? ((await res.json()) as CourseResponse) : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, apiFetch]);

  // Playback URLs are a separate, gated request — the contents list above is
  // public, the files are not.
  const episodeId = located?.episode.id;

  const loadPlayback = useCallback(async () => {
    if (!episodeId) return;
    const res = await apiFetch(`/episodes/${episodeId}/play`);
    if (res.ok) {
      setPlay((await res.json()) as PlayResponse);
      setBlocked("none");
    } else {
      setPlay(null);
      setBlocked(res.status === 401 ? "sign-in" : "purchase");
    }
  }, [episodeId, apiFetch]);

  useEffect(() => {
    // Deferred a tick: react-hooks/set-state-in-effect flags a setState the
    // effect body can reach synchronously, and loadPlayback sets state once
    // its request resolves. Same pattern used elsewhere in this codebase.
    const id = window.setTimeout(() => void loadPlayback(), 0);
    return () => window.clearTimeout(id);
  }, [loadPlayback]);

  /**
   * Signed URLs last an hour, which is shorter than plenty of viewing
   * sessions — someone who pauses over lunch would come back to a video that
   * refuses to seek. Re-minting a couple of minutes early keeps that invisible:
   * the player swaps the file underneath and holds the viewer's position.
   */
  useEffect(() => {
    const ttl = play?.expiresIn;
    if (!ttl) return;
    const delay = Math.max(30_000, (ttl - 120) * 1000);
    const id = window.setTimeout(() => void loadPlayback(), delay);
    return () => window.clearTimeout(id);
  }, [play, loadPlayback]);

  // Latest position, kept in a ref so the unmount save reads the current value
  // without re-subscribing on every tick.
  const position = useRef({ seconds: 0, lang: lang as Lang });
  const lastSaveAt = useRef(0);
  const remints = useRef(0);

  const save = useCallback(
    (seconds: number, language: Lang, completed = false) => {
      if (!episodeId || status !== "authed") return;
      void apiFetch(`/progress/${episodeId}`, {
        method: "PUT",
        body: JSON.stringify({ positionSec: Math.round(seconds), lang: language, completed }),
      });
    },
    [episodeId, status, apiFetch],
  );

  const onPosition = useCallback(
    (seconds: number, language: Lang) => {
      position.current = { seconds, lang: language };
      const now = Date.now();
      if (now - lastSaveAt.current < SAVE_EVERY_MS) return;
      lastSaveAt.current = now;
      save(seconds, language);
    },
    [save],
  );

  // Leaving the page mid-episode is the common case, so the last few seconds
  // are flushed on the way out rather than lost.
  useEffect(() => {
    return () => {
      if (position.current.seconds > 5) save(position.current.seconds, position.current.lang);
    };
  }, [save]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4" aria-busy>
        <div className="aspect-video w-full animate-pulse rounded-2xl bg-neutral-90/8" />
        <div className="h-6 w-1/2 animate-pulse rounded-lg bg-neutral-90/8" />
      </div>
    );
  }

  if (!course || !located) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-90/10">
        <h1 className="font-noi-grotesk text-[22px] tracking-[-0.02em]">No such episode</h1>
        <p className="mt-2 font-noi-grotesk text-[15px] leading-[1.45] text-neutral-50">
          That episode doesn&rsquo;t exist, or it has moved.
        </p>
        <Link
          href="/learn"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-neutral-90 px-6 font-noi-grotesk text-[15px] leading-none font-medium text-white"
        >
          Back to the course
        </Link>
      </div>
    );
  }

  const { module, episode, previous, next } = located;
  const sources = play
    ? Object.fromEntries(
        Object.entries(play.sources).map(([key, value]) => [key, value.url]),
      )
    : {};
  const missingHere = !episode.languages[lang];
  // The language it *does* exist in — not assumed to be English, since one
  // module 3 episode was only ever recorded in Malayalam.
  const fallbackLang: Lang = episode.languages.en ? "en" : "ml";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <nav className="flex items-center gap-2 font-noi-grotesk text-[14px] text-neutral-50">
        <Link href="/learn" className="transition-colors hover:text-neutral-90">
          Course
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate">{localized(module.title, lang)}</span>
      </nav>

      {blocked === "none" && play ? (
        <VideoPlayer
          key={`${episode.id}-${lang}`}
          sources={sources}
          initialLanguage={lang}
          startAt={episode.progress?.positionSec ?? 0}
          onPosition={onPosition}
          onFinished={(language) => save(position.current.seconds, language, true)}
          onLanguageChange={(next) => setLangOverride(next)}
          // A URL that expired while the tab slept — mint another and carry on.
          onMediaError={() => {
            if (remints.current >= MAX_REMINTS) return;
            remints.current += 1;
            void loadPlayback();
          }}
          // Marks a screen recording with the account it was played on. The
          // one leak path signed URLs can't touch is a camera or a capture
          // tool, and this is what makes that traceable.
          watermark={[user?.email, user?.phone].filter(Boolean).join(" · ")}
          className="shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-neutral-90 p-6">
          {blocked === "sign-in" ? (
            <SignIn heading="Sign in to watch" />
          ) : (
            <div className="text-center text-white">
              <h2 className="font-noi-grotesk text-[22px] tracking-[-0.02em]">
                This episode is part of the programme
              </h2>
              <p className="mx-auto mt-2 max-w-sm font-noi-grotesk text-[15px] leading-[1.45] text-white/70">
                Join to unlock all {course.modules.flatMap((m) => m.episodes).length} episodes across{" "}
                {course.modules.length} modules.
              </p>
              <Link
                href="/order"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-lime-30 px-6 font-noi-grotesk text-[15px] leading-none font-medium text-neutral-90 transition hover:bg-lime-40"
              >
                Join now
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-noi-grotesk text-[24px] leading-[1.15] tracking-[-0.025em] text-pretty sm:text-[30px]">
              {localized(episode.title, lang)}
            </h1>
            <LanguageToggle value={lang} onChange={setLangOverride} />
          </div>

          {missingHere ? (
            <p className="rounded-xl bg-neutral-90/6 px-4 py-3 font-noi-grotesk text-[14px] leading-[1.45] text-neutral-70">
              This episode hasn&rsquo;t been recorded in{" "}
              {lang === "ml" ? "Malayalam" : "English"} yet — you&rsquo;re watching the{" "}
              {fallbackLang === "en" ? "English" : "Malayalam"} version.
            </p>
          ) : null}

          {localized(episode.blurb, lang) ? (
            <p className="font-noi-grotesk text-[16px] leading-[1.5] tracking-[-0.015em] text-neutral-70">
              {localized(episode.blurb, lang)}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-3">
            {previous ? (
              <Link
                href={previous.href}
                className="inline-flex h-11 max-w-full items-center gap-2 rounded-full border border-neutral-90/20 px-5 font-noi-grotesk text-[15px] leading-none transition-colors hover:bg-neutral-90/6"
              >
                <span aria-hidden>←</span>
                <span className="truncate">{previous.title}</span>
              </Link>
            ) : null}
            {next ? (
              <Link
                href={next.href}
                className="inline-flex h-11 max-w-full items-center gap-2 rounded-full bg-neutral-90 px-5 font-noi-grotesk text-[15px] leading-none text-white transition-colors hover:bg-neutral-100"
              >
                <span className="truncate">{next.title}</span>
                <span aria-hidden>→</span>
              </Link>
            ) : null}
          </div>
        </div>

        {/* This module's contents, so the next episode is one click away
            without going back to the overview. */}
        <aside className="w-full shrink-0 lg:w-72">
          <h2 className="mb-2 font-noi-grotesk text-[12px] font-medium tracking-[0.12em] text-neutral-50 uppercase">
            {localized(module.title, lang)}
          </h2>
          <ol className="flex list-none flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-90/10">
            {module.episodes.map((item, i) => {
              const current = item.id === episode.id;
              const media = item.languages[lang] ?? item.languages.en ?? item.languages.ml;
              return (
                <li key={item.id}>
                  <Link
                    href={`/learn/${module.order + 1}/${item.key}`}
                    aria-current={current ? "true" : undefined}
                    className={`flex items-center gap-2.5 border-b border-neutral-90/8 px-4 py-3 last:border-b-0 transition-colors duration-150 ${
                      current ? "bg-neutral-90/6" : "hover:bg-neutral-90/4"
                    }`}
                  >
                    <span className="w-4 shrink-0 font-noi-grotesk text-[12px] tabular-nums text-neutral-50">
                      {item.progress?.completed ? "✓" : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-noi-grotesk text-[14px] leading-[1.35] text-neutral-90">
                      {localized(item.title, lang)}
                    </span>
                    {media ? (
                      <span className="shrink-0 font-noi-grotesk text-[12px] tabular-nums text-neutral-50">
                        {formatDuration(media.durationSec)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}
