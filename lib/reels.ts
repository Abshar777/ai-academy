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
};

export const REELS: Reel[] = [];

/** The profile the "follow" link points at. Empty hides the link. */
export const INSTAGRAM_URL = "";
