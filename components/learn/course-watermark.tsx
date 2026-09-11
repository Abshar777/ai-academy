"use client";

/*
 * A forensic identity overlay that rides over the entire course area — not
 * just the video frame. The player has its own watermark, but the contents
 * list, episode text and everything else are also worth stamping: a
 * screen-recorded leak of any part of the course then carries the account it
 * was played on.
 *
 * Deliberately non-obstructive: it never takes pointer events, sits at low
 * opacity, and uses `mix-blend-mode: difference` so a single colour stays
 * legible over both the light course pages and the dark video. It drifts
 * between edge zones every few seconds — a static mark can be cropped out of a
 * re-encode, a moving one cannot.
 *
 * It yields on an episode page, where the player carries two marks of its own
 * inside the video frame. Before that it added a third, drifting over the page
 * beside the video and half-vanishing as it crossed the frame edge, which read
 * as a rendering fault rather than as security. See lib/identity-stamp.ts.
 */
import { useEffect, useMemo, useState } from "react";
import { useAcademyAuth } from "@/components/academy-auth";
import { useStampedElsewhere } from "@/lib/identity-stamp";

/* [top%, left%, anchorRight] — edge zones only, so the tag never sits dead
   centre over what someone is actually reading or watching. */
const ZONES: Array<[number, number, boolean]> = [
  [10, 4, false], [12, 60, false],
  [30, 96, true], [40, 4, false],
  [54, 96, true], [58, 4, false],
  [74, 40, false], [80, 96, true],
];
const MOVE_EVERY_MS = 7000;

export function CourseWatermark() {
  const { status, user } = useAcademyAuth();
  const stampedElsewhere = useStampedElsewhere();
  const [zone, setZone] = useState(0);

  const tag = useMemo(
    () => [user?.email, user?.phone].filter(Boolean).join(" · "),
    [user],
  );

  useEffect(() => {
    if (!tag) return;
    const id = setInterval(() => {
      setZone((z) => {
        let next = Math.floor(Math.random() * ZONES.length);
        if (next === z) next = (next + 1) % ZONES.length;
        return next;
      });
    }, MOVE_EVERY_MS);
    return () => clearInterval(id);
  }, [tag]);

  if (status !== "authed" || !tag || stampedElsewhere) return null;

  const [top, left, anchorRight] = ZONES[zone]!;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 select-none overflow-hidden">
      <span
        style={{
          position: "absolute",
          top: `${top}%`,
          left: `${left}%`,
          transform: anchorRight ? "translateX(-100%)" : "none",
          transition: "top 1.8s ease, left 1.8s ease, transform 1.8s ease",
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: "nowrap",
          color: "rgba(255,255,255,0.5)",
          mixBlendMode: "difference",
        }}
      >
        {tag}
      </span>
    </div>
  );
}
