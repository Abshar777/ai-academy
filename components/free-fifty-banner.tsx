"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

/**
 * The one card on the page whose entire job is to catch a scrolling thumb and
 * make it stop — pricing-section.tsx (homepage) and order-form.tsx (/order).
 *
 * It used to run a "first 50 students free" countdown; the pitch is now the
 * argument itself, which doesn't expire and doesn't need honouring by hand.
 * The export keeps its old name so the two callers don't have to change.
 *
 * The enrolled count underneath is real — fetched from app/api/students-count,
 * which reads captured payments — and appears only once it is worth showing.
 * A claim about learning to build lands harder next to the number of people
 * already doing it; next to a number in single figures it lands worse than
 * saying nothing, so it stays hidden until it helps.
 */

/** Below this, the count argues against the copy rather than for it. It
 *  appears on its own once real enrolments pass the line. */
const MIN_COUNT_TO_SHOW = 25;

/** Counts 0 -> target once, starting only when the caller flips `start` to
 *  true (gated on scroll-into-view — see useInView below — rather than on
 *  mount, so the count-up is part of the "stop scrolling" moment). */
function useCountUp(target: number | null, start: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === null || !start) return;
    const targetValue = target;
    let raf: number;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutExpo — fast start, long gentle settle, reads as more "alive"
      // than a linear count.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(targetValue * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, durationMs]);

  return value;
}




function LiveDot() {
  return (
    <span className="relative flex size-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-30 opacity-75" />
      <span className="relative inline-flex size-1.5 rounded-full bg-lime-30" />
    </span>
  );
}

export function FreeFiftyBanner({ className = "" }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/students-count")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data?.count === "number") setCount(data.count);
      })
      .catch(() => {
        // Best-effort — the promo copy still reads fine with no count shown.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayed = useCountUp(count, inView || Boolean(reducedMotion));

  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? undefined : { opacity: 0, scale: 0.9, y: 24 }}
      animate={inView || reducedMotion ? { opacity: 1, scale: 1, y: 0 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`ffb-card relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] sm:p-6 ${className}`}
    >
      <div className="relative z-10 flex flex-col items-start gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-noi-grotesk text-[11px] font-medium tracking-[0.08em] text-lime-30 uppercase ring-1 ring-white/15">
          <LiveDot />
          Learn. Build. Ship.
        </span>

        <h2 className="max-w-[22ch] font-sans-plomb text-[26px] leading-[1.02] font-semibold tracking-[-0.015em] text-balance uppercase sm:text-[34px] md:text-[40px]">
          You don&rsquo;t need a big course to become a{" "}
          <span className="text-lime-30">developer</span>.
        </h2>

        <p className="font-noi-grotesk text-[16px] leading-[1.4] tracking-[-0.015em] text-white/70 sm:text-[18px]">
          Everything you need to build is here.
        </p>

        {count !== null && count >= MIN_COUNT_TO_SHOW && (
          <p className="mt-1 font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-white/45">
            <span className="font-sans-plomb text-[17px] font-semibold text-white tabular-nums">
              {displayed}
            </span>{" "}
            already building with us
          </p>
        )}
      </div>
    </motion.div>
  );
}
