import { Instrument_Serif } from "next/font/google";

/**
 * The landing page's own type. Neither face is used on the marketing site.
 *
 * Instrument Serif carries the one italic emphasis word in each headline and
 * is self-hosted here by next/font at build time.
 *
 * Switzer, which carries everything else, is not on Google Fonts: it comes
 * from Fontshare under its free licence, through the stylesheet link in the
 * page. next/font cannot manage that, so the page declares "Switzer" by name
 * in its CSS and preconnects to Fontshare's CDN to keep the swap short.
 */
export const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--lp-font-serif",
  display: "swap",
});

export const SWITZER_CSS = "https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap";
