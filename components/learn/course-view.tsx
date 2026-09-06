"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAcademyAuth } from "@/components/academy-auth";
import { SignIn } from "./sign-in";
import { LanguageToggle } from "./language-toggle";
import { EpisodeRow } from "./episode-row";
import {
  COURSE_SLUG,
  localized,
  type CourseResponse,
  type Lang,
} from "@/lib/academy-api";

/**
 * The course contents.
 *
 * Readable signed out on purpose: someone who hasn't paid sees every module and
 * episode with the locked ones marked, which argues for the programme far
 * better than a sign-in wall would. The videos themselves are gated server
 * side — see /episodes/:id/play.
 */
export function CourseView() {
  const { status, user, apiFetch, redeemHandoff, signOut } = useAcademyAuth();
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [handoffReady, setHandoffReady] = useState(false);
  const [langOverride, setLangOverride] = useState<Lang | null>(null);

  // Derived rather than synced into state, so the account's saved preference
  // applies the moment the session resolves without an extra render pass.
  const lang: Lang = langOverride ?? user?.preferredLang ?? "en";

  /**
   * Straight after a purchase the buyer arrives with a one-time ticket in the
   * URL. Redeem it before anything else so the page loads already signed in,
   * then strip it — it is spent, and it has no business staying in history.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const ticket = params.get("ht");
      if (ticket) {
        await redeemHandoff(ticket);
        params.delete("ht");
        const query = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
      }
      if (!cancelled) setHandoffReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [redeemHandoff]);

  useEffect(() => {
    if (!handoffReady || status === "loading") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/courses/${COURSE_SLUG}`);
        const data = res.ok ? ((await res.json()) as CourseResponse) : null;
        if (cancelled) return;
        setCourse(data);
        setFailed(!data);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handoffReady, status, apiFetch]);

  const changeLanguage = useCallback(
    (next: Lang) => {
      setLangOverride(next);
      // Saved on the account rather than in this browser, so the choice
      // follows the learner to their phone.
      if (status === "authed") {
        void apiFetch("/me", { method: "PATCH", body: JSON.stringify({ preferredLang: next }) });
      }
    },
    [status, apiFetch],
  );

  const stats = useMemo(() => {
    if (!course) return null;
    const episodes = course.modules.flatMap((m) => m.episodes);
    return {
      total: episodes.length,
      completed: episodes.filter((e) => e.progress?.completed).length,
      resume: episodes.find((e) => e.id === course.resumeEpisodeId) ?? null,
      resumeModule: course.modules.find((m) =>
        m.episodes.some((e) => e.id === course.resumeEpisodeId),
      ),
    };
  }, [course]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3" aria-busy>
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-neutral-90/8" />
        <div className="h-4 w-1/3 animate-pulse rounded-lg bg-neutral-90/8" />
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-neutral-90/8" />
      </div>
    );
  }

  if (failed || !course) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-90/10">
        <h1 className="font-noi-grotesk text-[22px] tracking-[-0.02em]">
          The course isn&rsquo;t loading
        </h1>
        <p className="mt-2 font-noi-grotesk text-[15px] leading-[1.45] text-neutral-50">
          Something went wrong reaching the course. Refresh the page, and if it keeps happening let
          us know.
        </p>
      </div>
    );
  }

  const signedIn = status === "authed";
  const progressPercent = stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-noi-grotesk text-[28px] leading-[1.1] tracking-[-0.025em] text-pretty sm:text-[34px]">
              {localized(course.course.title, lang)}
            </h1>
            <p className="mt-1.5 font-noi-grotesk text-[15px] leading-[1.4] text-neutral-50">
              {course.modules.length} modules · {stats?.total} episodes
              {signedIn && course.entitled ? ` · ${stats?.completed} finished` : ""}
            </p>
          </div>
          <LanguageToggle value={lang} onChange={changeLanguage} />
        </div>

        {signedIn && course.entitled && stats?.total ? (
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-90/10">
              <div
                className="h-full rounded-full bg-lime-30 transition-[width] duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-noi-grotesk text-[13px] tabular-nums text-neutral-50">
              {progressPercent}%
            </span>
          </div>
        ) : null}

        {signedIn ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-noi-grotesk text-[14px] text-neutral-50">
            <span>Signed in as {user?.email}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="underline underline-offset-4 transition-colors hover:text-neutral-90"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </header>

      {/* Resume, when there's somewhere to resume to. */}
      {signedIn && course.entitled && stats?.resume && stats.resumeModule ? (
        <Link
          href={`/learn/${stats.resumeModule.order + 1}/${stats.resume.key}`}
          className="group flex items-center justify-between gap-4 rounded-2xl bg-neutral-90 p-5 text-white transition-transform duration-150 hover:scale-[1.01]"
        >
          <div className="min-w-0">
            <span className="font-noi-grotesk text-[12px] font-medium tracking-[0.12em] text-lime-30 uppercase">
              Continue watching
            </span>
            <p className="mt-1 truncate font-noi-grotesk text-[18px] leading-[1.25] tracking-[-0.015em]">
              {localized(stats.resume.title, lang)}
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime-30 text-neutral-90 transition-transform duration-150 group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="ml-0.5 size-5" aria-hidden>
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </span>
        </Link>
      ) : null}

      {/* Not signed in, or signed in without having bought — one clear next step. */}
      {!signedIn ? (
        <SignIn heading="Already enrolled? Sign in" />
      ) : !course.entitled ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-6 ring-1 ring-lime-30 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-noi-grotesk text-[18px] tracking-[-0.02em]">
              You don&rsquo;t have access to this course yet
            </h2>
            <p className="mt-1 font-noi-grotesk text-[15px] leading-[1.45] text-neutral-50">
              Enrolled under a different email? Sign out and use that one instead.
            </p>
          </div>
          <Link
            href="/order"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-neutral-90 px-6 font-noi-grotesk text-[15px] leading-none font-medium text-white transition hover:bg-neutral-100"
          >
            Join now
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-8">
        {course.modules.map((module) => (
          <section key={module.id} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <span className="font-noi-grotesk text-[13px] font-medium tabular-nums text-neutral-50">
                {String(module.order + 1).padStart(2, "0")}
              </span>
              <h2 className="font-noi-grotesk text-[20px] leading-[1.2] tracking-[-0.02em] text-pretty">
                {localized(module.title, lang)}
              </h2>
            </div>
            <ol className="flex list-none flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-90/10">
              {module.episodes.map((episode, i) => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  index={i}
                  lang={lang}
                  href={`/learn/${module.order + 1}/${episode.key}`}
                  unlocked={course.entitled || episode.isFree}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
