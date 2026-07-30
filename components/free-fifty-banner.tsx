"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

/**
 * "First 50 students get free access" promo — pricing-section.tsx (homepage)
 * and order-form.tsx (/order). The enrolled count is real, fetched from
 * app/api/students-count (captured Razorpay payments), not a fabricated
 * number — this is a banner only for now, checkout still charges normally;
 * the free seats are honored manually outside this codebase.
 *
 * Deliberately louder than the rest of the UI — a dark glowing card, a
 * scroll-triggered scale-in, a count-up on the number, and a shimmer sweep
 * on the progress bar — this is the one section whose entire job is to
 * catch a scrolling thumb and make it stop.
 */

const FREE_SEATS = 50;

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
  const spotsLeft = count === null ? null : Math.max(0, FREE_SEATS - count);
  const claimed = spotsLeft === 0;
  const pct = count === null ? 0 : Math.min(100, (displayed / FREE_SEATS) * 100);

  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? undefined : { opacity: 0, scale: 0.9, y: 24 }}
      animate={inView || reducedMotion ? { opacity: 1, scale: 1, y: 0 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`ffb-card relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] sm:p-6 ${className}`}
    >
      {/* <div className="ffb-glow" aria-hidden /> */}

      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-noi-grotesk text-[11px] font-medium tracking-[-0.01em] text-lime-30 ring-1 ring-white/15">
          <LiveDot />
          Launch offer
        </span>

        <p className="mt-3 font-sans-plomb text-[24px] leading-[1.05] font-semibold tracking-[-0.015em] sm:text-[30px]">
          {claimed ? (
            "Free seats claimed — join the next cohort"
          ) : (
            <>
              First <span className="text-lime-30">50 students</span> get free access
            </>
          )}
        </p>

        {!claimed && (
          <p className="mt-1 font-noi-grotesk text-[13px] font-medium tracking-[-0.01em] text-lime-30/90">
            Exclusively for Delta Digital Academy students
          </p>
        )}

        <p className="mt-1.5 font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-white/60">
          {count === null ? (
            "Loading enrolment count…"
          ) : claimed ? (
            `${displayed} students have already enrolled.`
          ) : (
            <>
              <span className="font-sans-plomb text-[18px] font-semibold text-white tabular-nums">
                {displayed}
              </span>{" "}
              enrolled so far · <span className="text-lime-30">{spotsLeft} free spot{spotsLeft === 1 ? "" : "s"} left</span>
            </>
          )}
        </p>

        {count !== null && (
          <div className="ffb-progress-track mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="ffb-progress-fill h-full rounded-full bg-lime-30 transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
