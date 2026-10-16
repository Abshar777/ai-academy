/**
 * The visitor's country, from the clock their own browser is set to.
 *
 * The site has no server-side geo. middleware.ts reads `x-vercel-ip-country`,
 * which only exists on Vercel's edge, and this is served by nginx on a VPS —
 * so that header has never arrived and never will. The middleware wrote the
 * empty string it found into the cookie anyway, and an empty country reads as
 * India, so every visitor on earth was quoted ₹1,499 and pinned there for a
 * month. That is what this replaces.
 *
 * Only two prices exist: India pays INR, everywhere else pays AED. So the map
 * below only has to recognise India and the Gulf; anything else it can read is
 * "somewhere that pays in dirhams", which is exactly what OTHER means.
 *
 * A caveat worth knowing rather than discovering: several Gulf zones are
 * aliases in the IANA database — Kuwait, Bahrain and Qatar devices usually
 * report Asia/Riyadh, and Oman reports Asia/Dubai. The country can therefore
 * be a neighbour's. The *price* is right either way, which is the thing that
 * matters, and the picker on /order corrects the label.
 *
 * Deliberately free of imports so a client component can use it without
 * dragging anything behind it.
 */

const TIMEZONE_COUNTRY: Record<string, string> = {
  // India. Asia/Calcutta is the old name and still what some devices send.
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",

  // The Gulf. Each resolves to the AED plan; see the alias note above.
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA",
  "Asia/Bahrain": "BH",
  "Asia/Kuwait": "KW",
  "Asia/Muscat": "OM",
  "Asia/Aden": "SA",
};

/**
 * The country to price this visitor in, or "" when the browser will not say.
 *
 * "" rather than a guess: the caller decides what an unknown visitor pays, and
 * that is a business decision rather than something to bury in here.
 */
export function countryFromTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return "";
    if (TIMEZONE_COUNTRY[zone]) return TIMEZONE_COUNTRY[zone];
    // A zone we can read but do not special-case is simply not India, and the
    // AED plan covers all of those.
    return "OTHER";
  } catch {
    // Intl can throw in a locked-down or very old browser.
    return "";
  }
}
