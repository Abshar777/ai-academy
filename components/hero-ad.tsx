import { AdPlayer } from "./ad-player";

/**
 * The film, directly under the hero.
 *
 * A section of its own rather than part of components/hero.tsx: the hero is
 * a server component with its own entrance choreography, and the player is
 * interactive. Keeping them apart means the hero stays static markup.
 */
export function HeroAd() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 pb-14 sm:px-6 sm:pb-16 lg:pb-20">
      <AdPlayer
        src="/ad/academy-ad.mp4"
        poster="/ad/academy-ad.jpg"
        label="Delta AI Academy — what the programme is"
        idPrefix="hero-film"
      />
    </section>
  );
}
