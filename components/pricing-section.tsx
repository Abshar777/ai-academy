"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ContactButton } from "./contact-dialog";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { CheckIcon } from "./check-icon";
import { StaggerGroup, StaggerItem } from "./stagger";

/** The actual purchase workflow — there's no live checkout on the site, so
 *  this is what "buying" the course means: a fast lead-and-payment-method
 *  form (below) instead of a shopping cart. */
const HOW_TO_JOIN = [
  {
    step: "01",
    title: "Tell us you're in",
    body: "Tap “Join now” and leave your name, email and phone — takes under a minute.",
  },
  {
    step: "02",
    title: "Choose how to pay",
    body: "Pick pay in full, or split it with Tabby or Tamara, or Razorpay — right there in the same form.",
  },
  {
    step: "03",
    title: "Get your payment link, fast",
    body: "The team follows up with the right link for the method you picked — no back-and-forth to figure it out.",
  },
];

/** Everything in the programme, since there's only the one plan. */
const INCLUDED = [
  "Four complete applications, web and mobile",
  "Five skill areas: full stack, mobile, backend, database, deployment",
  // "Twelve AI tools and coding agents",
  "Production deployment on Vercel, Hostinger VPS and Cloudflare",
  // "Portfolio projects you can show",
  "No prior coding experience needed",
  "Live support in English and Malayalam",
];

/**
 * Class preview slot with looping background video.
 *
 * The file is only fetched once the card is near the viewport. Autoplaying it
 * on mount cost 1.7MB of bandwidth during page load — for a card eight screens
 * down — competing with the fonts and JS in exactly the window where the intro
 * and hero are trying to animate.
 */
function ClassPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let near = false;

    const apply = () => {
      if (!near) return;
      if (query.matches) {
        video.pause();
      } else {
        // preload="none" means there's nothing buffered yet; play() kicks off
        // the fetch itself.
        video.play().catch(() => { });
      }
    };

    // A screen of margin, so it's ready by the time it's actually looked at.
    const observer = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        if (near) apply();
        else video.pause();
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(video);
    query.addEventListener("change", apply);

    return () => {
      observer.disconnect();
      query.removeEventListener("change", apply);
    };
  }, []);

  return (
    <div className="group relative flex aspect-4/3 w-full flex-col justify-between overflow-hidden rounded-3xl p-8 md:p-10 border border-neutral-10/20 bg-neutral-10">
      {/* Background Video */}
      {/* loop, because the clip is now exactly 20s — the old handler that
          rewound at 20s can never fire on a 20s file. */}
      <video
        ref={videoRef}
        src="/video.mp4"
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay - semi-transparent gradient matches brand while maintaining text contrast */}
      <div
        className="absolute inset-0 bg-[linear-gradient(150deg,#7af4ff_0%,#cdf3ff_38%,#f3f4fa_100%)] opacity-10 transition-opacity duration-300 "
        aria-hidden="true"
      />

      <span className="relative z-10 font-noi-grotesk text-[16px] leading-[1.4] font-medium tracking-[-0.015em] text-white/90">

      </span>

      <div className="relative z-10 flex flex-col gap-5">
        <span
          aria-hidden
          className="flex size-16 items-center justify-center rounded-full bg-neutral-90 transition-transform duration-300 group-hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="#fff" aria-hidden>
            <path d="M8 5.5v13l11-6.5-11-6.5Z" />
          </svg>
        </span>
        <span className="font-sans-plomb text-[40px] leading-[0.95] font-semibold tracking-[-0.015em] uppercase xl:text-[48px] text-white">
          See a class
          <br />
          before you join
        </span>
      </div>
    </div>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 pb-16 lg:items-center">
        <Reveal
          as="span"
          className="inline-block rounded-full bg-neutral-10 px-5 py-3 text-[16px] leading-[1.5] [--translateY-from:20%]"
        >
          Pricing
        </Reveal>
        <SplitReveal
          as="h2"
          delay={0.15}
          className="font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] text-balance1 [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:text-center lg:[--translateY-from:40%] xl:text-[48px]"
        >
          One plan. Everything included.
        </SplitReveal>
      </div>

      <StaggerGroup
        className="mx-auto mb-10 grid w-full max-w-6xl gap-4 sm:grid-cols-3 lg:mb-16"
        stagger={0.1}
      >
        {HOW_TO_JOIN.map((item) => (
          <StaggerItem
            key={item.step}
            distance={20}
            className="flex flex-col gap-3 rounded-2xl bg-neutral-10 p-6"
          >
            <span className="font-sans-plomb text-[28px] leading-[0.9] font-semibold tracking-[-0.015em] text-neutral-90/25">
              {item.step}
            </span>
            <h3 className="font-noi-grotesk text-[18px] leading-[1.2] tracking-[-0.02em]">
              {item.title}
            </h3>
            <p className="font-noi-grotesk text-[15px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
              {item.body}
            </p>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-2 lg:items-stretch">
        <Reveal className="flex [--translateY-from:20%]">
          <ClassPreview />
        </Reveal>

        <Reveal delay={0.15} className="flex [--translateY-from:20%]">
          <div className="flex flex-1 flex-col gap-8 rounded-3xl bg-neutral-10 p-8 md:p-10">
            <div className="flex flex-col gap-4">
              <span className="font-noi-grotesk text-[18px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
                Full programme
              </span>
              <SplitReveal
                as="p"
                unit="chars"
                stagger={0.04}
                className="flex items-baseline gap-3 font-sans-plomb text-[56px] leading-[0.9] font-semibold tracking-[-0.015em] sm:text-[72px] xl:text-[88px]"
              >
                AED&nbsp;99
              </SplitReveal>
              <SplitReveal
                as="p"
                delay={0.15}
                className="font-noi-grotesk text-[18px] leading-[1.4] tracking-[-0.015em] text-pretty"
              >
                One price for the whole programme every project, every tool,
                every skill area. No tiers to compare.
              </SplitReveal>
            </div>

            <StaggerGroup
              as="ul"
              className="flex list-none flex-col gap-4"
              stagger={0.07}
              delay={0.2}
            >
              {INCLUDED.map((item) => (
                <StaggerItem
                  as="li"
                  key={item}
                  distance={16}
                  className="flex max-w-full items-start gap-4"
                >
                  <CheckIcon className="size-3 shrink-0 translate-y-2" />
                  <span className="shrink font-noi-grotesk text-[16px] leading-[1.4] tracking-[-0.015em]">
                    {item}
                  </span>
                </StaggerItem>
              ))}
            </StaggerGroup>

            <div className="mt-auto flex flex-col gap-3 sm:flex-row">
              {/* Only this "Join now" goes to /order — every other one on the
                  site still opens the enquiry modal. This is the one button
                  next to an actual price, so it's the one that should behave
                  like a real "buy" action. */}
              <Link
                href="/order"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-neutral-90 sm:flex-1 px-5 text-[18px] leading-none font-medium text-white transition duration-150 ease-in-out hover:bg-neutral-70"
              >
                Join now
              </Link>
              <ContactButton
                source="pricing"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg border border-neutral-90 sm:flex-1 px-5 text-[18px] leading-none font-medium transition duration-150 ease-in-out hover:bg-neutral-90/8"
              >
                Talk to our team
              </ContactButton>
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-90/10 pt-6">
              <span className="font-noi-grotesk text-[13px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
                Pay in full, or split it at enrolment
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex h-9 items-center gap-2 rounded-lg border border-neutral-90/12 bg-white px-4">
                  <span
                    aria-hidden
                    className="block size-4 shrink-0"
                    style={{
                      backgroundColor: "#0C2451",
                      WebkitMaskImage: "url(/tools/razorpay.svg)",
                      maskImage: "url(/tools/razorpay.svg)",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                    }}
                  />
                  <span className="font-noi-grotesk text-[15px] leading-none tracking-[-0.01em] text-neutral-70">
                    Razorpay
                  </span>
                </span>
                {/* Real Tabby and Tamara badge artwork, supplied directly —
                    both are self-coloured, so they render as-is rather than
                    through the mask+colour technique the monochrome logos
                    use. Tamara's source file had generous transparent padding
                    around the badge; cropped to its real content bounds
                    (public/tools/tamara.png) so it sits at the same visual
                    weight as the others instead of reading smaller. */}
                <Image
                  src="/tools/tabby.svg"
                  alt="Tabby"
                  width={95}
                  height={37}
                  className="h-9 w-auto"
                />
                <Image
                  src="/tools/tamara.png"
                  alt="Tamara"
                  width={113}
                  height={36}
                  className="h-9 w-auto"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
