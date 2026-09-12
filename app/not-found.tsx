"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * 404. Renders inside the root layout, so the header and footer come with it
 * and a wrong URL still looks like the site rather than a dead end.
 *
 * app/not-found.tsx rather than the experimental global-not-found: that one is
 * for apps with several root layouts or a top-level dynamic segment, and
 * bypasses the layout — meaning styles, fonts and chrome would all have to be
 * imported again here. This app has a single root layout, so there is nothing
 * to work around.
 */
const REDIRECT_AFTER_SECONDS = 3;

export default function NotFound() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_AFTER_SECONDS);

  useEffect(() => {
    const tick = window.setInterval(
      () => setSecondsLeft((n) => Math.max(0, n - 1)),
      1000,
    );
    const go = window.setTimeout(() => {
      // router.push, not location.href: a client navigation keeps the fonts
      // and the already-loaded bundle rather than reloading the whole app.
      router.push("/");
    }, REDIRECT_AFTER_SECONDS * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(go);
    };
  }, [router]);

  return (
    <main className="page-surface flex min-h-screen flex-col items-center justify-center overflow-x-clip px-6 pt-28 pb-20 text-center md:pt-36 md:pb-32">
      <p className="font-noi-grotesk text-[64px] leading-none font-semibold tracking-[-0.04em] text-neutral-90/15 md:text-[96px]">
        404
      </p>

      <h1 className="mt-4 font-noi-grotesk text-[26px] leading-[1.1] tracking-[-0.025em] md:text-[32px]">
        This page doesn&rsquo;t exist
      </h1>
      <p className="mt-2 max-w-md font-noi-grotesk text-[15px] leading-[1.5] tracking-[-0.015em] text-neutral-50">
        The link may be out of date, or the address mistyped.
      </p>

      {/* aria-live, because a page that leaves on its own has to say so to
          somebody who cannot see the number counting down. */}
      <p
        aria-live="polite"
        className="mt-6 font-noi-grotesk text-[14px] leading-[1.45] tracking-[-0.015em] text-neutral-50"
      >
        Taking you to the home page
        {secondsLeft > 0 ? ` in ${secondsLeft}…` : "…"}
      </p>

      <Link
        href="/"
        className="mt-5 inline-flex h-12 items-center justify-center rounded-lg bg-neutral-90 px-6 font-noi-grotesk text-[16px] leading-none font-medium text-white transition duration-150 hover:bg-neutral-70"
      >
        Go to the home page
      </Link>
    </main>
  );
}
