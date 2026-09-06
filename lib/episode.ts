/**
 * Episode 1, free to watch in either language.
 *
 * EPISODE_SOURCES below are the object URLs, kept for reference — they are NOT
 * directly playable any more. The bucket is private, so those addresses answer
 * 401; a playable, signed URL comes from the course API's /episodes/free, which
 * components/free-episode-player.tsx fetches. The player still accepts a
 * `sources` prop of the same shape.
 */

export type EpisodeLanguage = "ml" | "en";

/** English first — it's the default the player opens on, and the toggle
 *  reads better with the selected one leading. */
export const EPISODE_LANGUAGES: { id: EpisodeLanguage; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "ml", label: "Malayalam", short: "ML" },
];

export const EPISODE_SOURCES: Record<EpisodeLanguage, string> = {
  ml: "https://pub-141ff6250c1340699608dcd12e1c2c92.r2.dev/videos/1787405729550-1377eaf663ce875d.mp4",
  en: "https://pub-141ff6250c1340699608dcd12e1c2c92.r2.dev/videos/1788549752604-5e2c86be3b6bbe6a.mp4",
};

export const EPISODE_TITLE = "Episode 1 — watch the full class, free";
export const EPISODE_BLURB =
  "The opening class of the programme, start to finish. No sign-up, no card — pick your language and press play.";

/** The standalone page, for anyone who'd rather not watch in a dialog. */
export const EPISODE_PAGE_PATH = "/watch";
