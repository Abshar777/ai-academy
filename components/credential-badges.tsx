import type { ReactNode } from "react";
import Image from "next/image";

/**
 * The two credentials, as a pair of pills: a Guinness World Record in AI, and
 * KHDA approval.
 *
 * They sit together on purpose. The record says the people teaching this are
 * exceptional; the KHDA approval says the academy behind them is a real,
 * regulated one. Apart, each invites the question the other answers.
 *
 * Wording is the business's own and is left exactly as given — both are
 * claims about outside bodies, and paraphrasing a regulator's approval into
 * something snappier is how a page ends up saying more than it is entitled to.
 *
 * A badge with a `logo` shows the real mark; without one it falls back to a
 * glyph. The wording stays either way — the GWR badge is a tall lockup, and at
 * the size a pill allows its own lettering is decorative rather than legible,
 * so the sentence beside it is what actually says the thing.
 *
 * The Guinness mark is the "Record Holder" badge GWR issues to holders for
 * exactly this use. KHDA has no artwork yet and stays on the glyph until it
 * arrives — a regulator's mark is not something to source off the web.
 *
 * The two labels are deliberately parallel — "...holding academy" next to
 * "...approved academy". Both say the same kind of thing about the same
 * subject, and matching their shape is what makes them read as one claim
 * rather than two slogans that happened to land together.
 *
 * Built for light surfaces — the hero's gradient and the order summary's
 * neutral-10 panel. A dark-surface variant can come when something needs one.
 */

function TrophyIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M7 4h10v5a5 5 0 0 1-10 0V4Zm10 1h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3m5 4v3m-3 3h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VerifiedIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6l-7-3Zm-2.5 8.5 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Badge = {
  label: string;
  Icon: (props: { className?: string }) => ReactNode;
  /** The official mark, with its intrinsic size so next/image can reserve the
   *  right box. Null falls back to the glyph above. */
  logo: { src: string; width: number; height: number } | null;
};

const BADGES: Badge[] = [
  {
    label: "Guinness World Record holding academy",
    Icon: TrophyIcon,
    logo: { src: "/brand/gwr-record-holder.webp", width: 1000, height: 1600 },
  },
  { label: "KHDA approved academy", Icon: VerifiedIcon, logo: null },
];

export function CredentialBadges({ className = "" }: { className?: string }) {
  return (
    // One strip rather than two separate pills. Side by side they sat at
    // different heights — one carries a tall mark, the other only a glyph —
    // and two floating boxes above a headline is one box too many. Joined by
    // a hairline they read as a single row of credentials. Phones stack them,
    // where side by side would wrap mid-sentence.
    <ul
      className={`inline-flex flex-col items-stretch gap-px overflow-hidden rounded-2xl border border-neutral-90/12 bg-white/75 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-0 sm:rounded-full ${className}`}
    >
      {BADGES.map(({ label, Icon, logo }, index) => (
        <li
          key={label}
          className={
            "inline-flex h-11 items-center gap-2 px-3.5 font-noi-grotesk text-[12px] leading-none font-medium tracking-[-0.015em] text-neutral-70 sm:text-[13px] " +
            // Hairline between the two, down the middle on a row and across
            // on a stack.
            (index > 0 ? "border-t border-neutral-90/10 sm:border-t-0 sm:border-l" : "")
          }
        >
          {/* A fixed slot either way, so the two labels start at the same
              offset whether the badge has a mark or a glyph. */}
          <span className="flex w-7 shrink-0 items-center justify-center">
            {logo ? (
              <Image
                src={logo.src}
                alt=""
                width={logo.width}
                height={logo.height}
                className="block h-7 w-auto"
              />
            ) : (
              <Icon className="size-4 text-[#5d7a00]" />
            )}
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
