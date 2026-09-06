"use client";

import Link from "next/link";
import { formatDuration, localized, type EpisodeSummary, type Lang } from "@/lib/academy-api";

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TickIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One row of the contents list.
 *
 * Locked rows stay visible and readable rather than being hidden — the list is
 * the strongest argument for the programme, and a row that says what it is and
 * that it's locked converts better than one that isn't there.
 */
export function EpisodeRow({
  episode,
  index,
  lang,
  href,
  unlocked,
}: {
  episode: EpisodeSummary;
  index: number;
  lang: Lang;
  href: string;
  unlocked: boolean;
}) {
  const media = episode.languages[lang] ?? episode.languages.en ?? episode.languages.ml;
  // Which language this episode does have, when it only has one. Not always
  // English: module 3 has a Malayalam-only episode, and labelling that
  // "English only" would send people looking for a video that isn't there.
  const only = (Object.keys(episode.languages) as Lang[]).length === 1
    ? (Object.keys(episode.languages) as Lang[])[0]
    : null;
  const missingHere = !episode.languages[lang];
  const done = episode.progress?.completed ?? false;
  const started = !done && (episode.progress?.positionSec ?? 0) > 5;
  const percent =
    started && media?.durationSec
      ? Math.min(100, Math.round(((episode.progress?.positionSec ?? 0) / media.durationSec) * 100))
      : 0;

  const body = (
    <>
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium tabular-nums ${
          done ? "bg-lime-30 text-neutral-90" : "bg-neutral-90/8 text-neutral-50"
        }`}
      >
        {done ? <TickIcon className="size-4" /> : index + 1}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-noi-grotesk text-[15px] leading-[1.35] tracking-[-0.015em] text-neutral-90">
          {localized(episode.title, lang)}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-noi-grotesk text-[13px] leading-[1.3] text-neutral-50">
          {media ? <span className="tabular-nums">{formatDuration(media.durationSec)}</span> : null}
          {episode.isFree ? <span className="text-lime-40">Free</span> : null}
          {/* Named rather than hidden, so a gap in the recordings reads as a
              gap and not as a broken toggle. */}
          {missingHere && only ? (
            <span>{only === "en" ? "English only" : "Malayalam only"}</span>
          ) : null}
          {started ? <span>{percent}% watched</span> : null}
        </span>
      </span>

      {!unlocked ? (
        <LockIcon className="size-4 shrink-0 text-neutral-50" />
      ) : (
        <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-neutral-50" aria-hidden>
          <path
            d="M5 3l6 5-6 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
    </>
  );

  const shared =
    "relative flex w-full items-center gap-3 border-b border-neutral-90/8 px-4 py-3.5 text-left last:border-b-0";

  return (
    <li className="contents">
      {unlocked ? (
        <Link href={href} className={`${shared} transition-colors duration-150 hover:bg-neutral-90/4`}>
          {body}
          {started ? (
            <span
              className="absolute bottom-0 left-0 h-0.5 bg-lime-30"
              style={{ width: `${percent}%` }}
            />
          ) : null}
        </Link>
      ) : (
        <div className={`${shared} cursor-not-allowed opacity-60`} aria-disabled>
          {body}
        </div>
      )}
    </li>
  );
}
