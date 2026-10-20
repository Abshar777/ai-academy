/**
 * The Instagram reels shown on the home page.
 *
 * Self-hosted rather than embedded. Instagram's own embed is a third-party
 * script that will not autoplay, renders a grey box until it loads, ignores
 * the site's type and colour entirely, and goes blank if a post is deleted or
 * the account goes private. These are our clips, so we serve them.
 *
 * To add one: put the .mp4 in public/reels/, put a poster frame beside it, and
 * add an entry here. The section renders nothing at all while this list is
 * empty, so a half-finished set never reaches a visitor.
 *
 * A poster is not optional in practice. Without one the card is a black
 * rectangle until enough video has arrived to paint a frame, and with several
 * on screen that is most of the section blank on a slow connection.
 *
 * On music: Instagram's licence for trending audio covers the clip on
 * Instagram, not on our own domain. Anything here should carry our own
 * voiceover or no audio worth hearing — which is also why they play muted.
 */

export type Reel = {
  /** Path under public/, e.g. "/reels/first-build.mp4". */
  src: string;
  /** Poster frame, same name with an image extension. */
  poster: string;
  /** The post itself, for the link out. Omit and the card simply doesn't link. */
  href?: string;
  /** What the clip shows — used as the accessible label, not displayed. */
  caption: string;
  /** "contain" for a clip that isn't vertical: it is letterboxed over a
   *  blurred still of itself rather than cropped to a centre strip. */
  fit?: "cover" | "contain";
};

/**
 * The six reels on the account as of 20 October 2026, newest first — the
 * order they appear on the profile.
 *
 * The files are the originals, re-encoded to 640px and H.264 for the web.
 * They are ~1-4MB each and nothing is fetched until a card scrolls into
 * view, so the 13MB on disk is not 13MB on anyone's connection.
 */
export const REELS: Reel[] = [
  {
    src: "/reels/reel-1.mp4",
    poster: "/reels/reel-1.jpg",
    href: "https://www.instagram.com/delta_ai_academy/reel/DetQUGFoIu5/",
    caption: "Trending now — a mentor shows a game landing page built on a laptop",
  },
  {
    src: "/reels/reel-2.mp4",
    poster: "/reels/reel-2.jpg",
    href: "https://www.instagram.com/delta_ai_academy/reel/Deb8Sq4kfi8/",
    caption: "A walk through the Delta AI Academy studio",
    // The one clip shot landscape. Cropped to a vertical strip it loses the
    // room, which is the whole subject.
    fit: "contain",
  },
  {
    src: "/reels/reel-3.mp4",
    poster: "/reels/reel-3.jpg",
    href: "https://www.instagram.com/delta_ai_academy/reel/DeT7j6yj9CQ/",
    caption: "Building an AI-driven digital marketing site from scratch",
  },
  {
    src: "/reels/reel-4.mp4",
    poster: "/reels/reel-4.jpg",
    href: "https://www.instagram.com/delta_ai_academy/reel/DeHShPBjvdd/",
    caption: "Build websites — walking through a finished architecture firm site",
  },
  {
    src: "/reels/reel-5.mp4",
    poster: "/reels/reel-5.jpg",
    href: "https://www.instagram.com/delta_ai_academy/reel/Dd87mqIjROh/",
    caption: "Making a 3D animated website",
  },
  {
    src: "/reels/reel-6.mp4",
    poster: "/reels/reel-6.jpg",
    href: "https://www.instagram.com/delta_ai_academy/reel/DdtZuWHCtLB/",
    caption: "What a student earned from their first freelance build",
  },
];

/** The profile the "follow" link points at. Empty hides the link. */
export const INSTAGRAM_URL = "https://www.instagram.com/delta_ai_academy/";
