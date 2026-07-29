/** Client-side read of the `country` cookie middleware.ts sets — for the
 *  in-chat enrol form, which (unlike /order) has no server component of its
 *  own to read cookies() in, since the chat widget lives in the layout and
 *  renders on every route. */
export function readCountryCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)country=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}
