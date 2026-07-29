import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Social share card. Generated at request time rather than a static asset, so
 * it stays in sync with the brand colours and copy used on the page itself
 * instead of drifting the way a hand-exported PNG would.
 *
 * The mark is embedded as a data URI read from app/icon.png (the same square
 * crop used for the favicon) — ImageResponse (satori) renders <img> tags but
 * can't resolve a same-origin relative path at generation time, so the bytes
 * have to be inlined directly.
 *
 * Deliberately skips the self-hosted brand fonts: satori's WOFF2 support is
 * version-dependent, and a broken OG image (the thing every share link shows
 * first) is a worse failure than falling back to a system sans for one image.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const iconBuffer = await readFile(join(process.cwd(), "app/icon.png"));
  const iconSrc = `data:image/png;base64,${iconBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundImage:
            "linear-gradient(160deg, #7af4ff -10%, #ffffff 65%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={iconSrc} width={72} height={72} alt="" />
          <span
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#14151c",
            }}
          >
            Delta AI Academy
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#14151c",
              maxWidth: 980,
            }}
          >
            Build AI powered applications
          </span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#3a3c52",
            }}
          >
            Even if you&rsquo;ve never coded before &mdash; 4 real projects,
            12 AI tools, one plan at AED&nbsp;99.
          </span>
        </div>
      </div>
    ),
    size,
  );
}
