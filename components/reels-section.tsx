import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { ReelCard } from "./reel-card";
import { InstagramIcon } from "./contact-icons";
import { INSTAGRAM_URL, REELS } from "@/lib/reels";

/**
 * The Instagram reels, as a scrolling row of phone-shaped cards.
 *
 * Renders nothing while lib/reels.ts is empty. A heading over an empty rail
 * is worse than no section, and it means this can ship before the clips
 * exist rather than waiting on them.
 *
 * The row scrolls horizontally on every size rather than wrapping into a
 * grid. Reels are a feed and read as one; a 3x2 block of them reads as a
 * gallery, and the overflow is what tells someone there are more.
 */
export function ReelsSection() {
  if (REELS.length === 0) return null;

  return (
    <section id="reels" className="py-14 sm:py-20 lg:py-32">
      <div className="flex flex-col items-center gap-8 sm:gap-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-8 px-6 lg:items-center">
          <Reveal
            delay={0.05}
            className="inline-block rounded-full bg-neutral-10 px-5 py-3 text-[16px] leading-[1.5] [--translateY-from:20%]"
          >
            From the feed
          </Reveal>

          <SplitReveal
            as="h2"
            delay={0.1}
            className="font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] text-balance1 [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:text-center lg:[--translateY-from:40%] xl:text-[48px]"
          >
            What we are building, as it happens
          </SplitReveal>
        </div>

        {/* Full-bleed: the row runs to both edges so the last card is cut off
            rather than ending in a tidy margin, which is what says to scroll. */}
        <Reveal className="w-full [--translateY-from:12%]">
          {/* w-fit + mx-auto rather than justify-center: a centred flex row
              that overflows puts its first item off the left edge and makes
              it unreachable, because there is no scroll range before the
              start. This way the row centres when it fits and scrolls from
              the beginning when it doesn't. scroll-px-6 matches the padding,
              or the first snap point lands flush against the edge and eats
              it. */}
          <ul className="mx-auto flex w-fit max-w-full snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2 sm:gap-4">
            {REELS.map((reel) => (
              <li key={reel.src} className="snap-start">
                <ReelCard reel={reel} />
              </li>
            ))}
          </ul>
        </Reveal>

        {INSTAGRAM_URL && (
          <Reveal delay={0.1} className="[--translateY-from:20%]">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-neutral-90 px-6 font-noi-grotesk text-[15px] leading-none font-medium tracking-[-0.015em] transition duration-150 ease-in-out hover:bg-neutral-90/8"
            >
              <InstagramIcon className="size-[18px]" />
              Follow on Instagram
            </a>
          </Reveal>
        )}
      </div>
    </section>
  );
}
