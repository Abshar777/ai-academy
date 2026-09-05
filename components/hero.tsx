import type { ReactNode } from "react";
import Link from "next/link";
import { BrochureLink } from "./brochure-link";
import { PlanPrice } from "./plan-price";
import { WebinarCta } from "./webinar-cta";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { StaggerGroup, StaggerItem } from "./stagger";

/**
 * Phone-only summary strip. Every figure is one the page states and backs up
 * further down — the projects stack, the tool ticker, the pricing card.
 */
const FACTS: { value: ReactNode; label: string }[] = [
  { value: "4", label: "projects" },
  { value: "12", label: "AI tools" },
  // Country-aware, so this can't quote AED to a visitor /order bills in INR.
  { value: <PlanPrice />, label: "one plan" },
];

type HeroCardProps = {
  title: string;
  body: string;
  cta: string;
  variant: "outline" | "solid";
  /** Seconds after the curtain lifts. Cards arrive one after the other. */
  delay: number;
  /** "brochure" opens the PDF directly; anything else goes to checkout. */
  action?: "order" | "brochure";
  /** Extra content between the body copy and the CTA — used to slot the
   *  next-webinar badge into the "Start building today" card only. */
  extra?: ReactNode;
};

function HeroCard({
  title,
  body,
  cta,
  variant,
  delay,
  action = "order",
  extra,
}: HeroCardProps) {
  const ctaClassName =
    "group inline-flex h-10 items-center justify-center rounded-lg px-4 text-[15px] leading-[1.1] font-medium tracking-[-0.015em] transition duration-150 ease-in-out sm:text-[16px] " +
    (variant === "solid"
      ? "bg-lime-30 text-black hover:bg-lime-40"
      : "border border-neutral-90 hover:bg-neutral-90/8");

  return (
    <Reveal
      hover
      delay={delay}
      className={
        "flex flex-1 flex-col gap-4 rounded-2xl p-6 text-left [--translateY-from:20%] sm:gap-6 sm:p-7 md:p-10 lg:basis-0 " +
        // The two cards were identical grey slabs on the grey wash, which read
        // as empty placeholders. The primary one now sits on white with the
        // brand edge; the secondary keeps the tint.
        (variant === "solid"
          ? "bg-white ring-1 ring-lime-30 sm:bg-neutral-10 sm:ring-0"
          : "bg-neutral-10")
      }
    >
      <h2 className="font-noi-grotesk text-[22px] leading-[1.1] tracking-[-0.025em] text-pretty sm:text-[26px] md:text-[32px]">
        {title}
      </h2>
      <p className="font-noi-grotesk text-[15px] leading-[1.45] tracking-[-0.015em] text-pretty text-neutral-50 sm:text-[16px] sm:leading-[1.4] sm:text-inherit">
        {body}
      </p>
      {extra}
      <div className="mt-auto">
        {action === "brochure" ? (
          <BrochureLink className={ctaClassName}>{cta}</BrochureLink>
        ) : (
          <Link href="/order" className={ctaClassName}>
            {cta}
          </Link>
        )}
      </div>
    </Reveal>
  );
}

export function Hero() {
  return (
    <div
      id="program"
      className="hero-light-gradient relative isolate overflow-hidden lg:min-h-[1107px]"
    >
      <section className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-5 pt-24 pb-14 sm:px-6 sm:pt-28 sm:pb-16 md:pt-32 lg:gap-20">
        <div className="flex flex-col items-center text-center">
          {/* Display line unfurls character by character out of its line
              masks once the curtain lifts. Sized off the viewport on phones so
              it fills the width instead of leaving a timid margin. */}
          <SplitReveal
            as="h1"
            unit="chars"
            start="intro"
            delay={0.15}
            className="mt-5 max-w-[820px] pb-2 font-sans-plomb text-[16vw] leading-[0.88] font-semibold tracking-[-0.02em] uppercase sm:mt-0 sm:text-[76px] sm:leading-[0.9] sm:tracking-[-0.015em] md:pb-4 md:text-[110px] lg:text-[120px] xl:text-[150px]"
          >
            Build AI powered applications
          </SplitReveal>

          <SplitReveal
            as="p"
            start="intro"
            delay={0.5}
            className="mt-5 max-w-[19rem] font-noi-grotesk text-[17px] leading-[1.35] tracking-[-0.015em] text-balance1 text-neutral-70 sm:mt-6 sm:max-w-none sm:text-[19px] sm:leading-[1.25] sm:text-inherit md:mt-10 md:max-w-md md:text-[24px] md:leading-[1.1]"
          >
            Even if you&rsquo;ve never coded before. We make AI development
            simple and accessible for beginners.
          </SplitReveal>

          <Reveal
            delay={0.6}
            className="mt-8 flex w-full justify-center [--translateY-from:20%] sm:mt-10"
          >
            <WebinarCta />
          </Reveal>

          {/* Phone-only: an action and the headline numbers land above the
              fold, instead of the fold ending on the body of a grey card. */}
          <Reveal
            delay={0.7}
            className="mt-7 flex w-full max-w-sm flex-col gap-3 [--translateY-from:20%] sm:hidden"
          >
            <Link
              href="/order"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-neutral-90 px-5 text-[16px] leading-none font-medium tracking-[-0.015em] text-white transition duration-150 ease-in-out active:scale-[0.98]"
            >
              Join now
            </Link>
            <BrochureLink className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-neutral-90/25 bg-white/60 px-5 text-[16px] leading-none font-medium tracking-[-0.015em] backdrop-blur-sm transition duration-150 ease-in-out active:scale-[0.98]">
              Get the brochure
            </BrochureLink>
          </Reveal>

          <StaggerGroup
            className="mt-8 grid w-full max-w-sm grid-cols-3 divide-x divide-neutral-90/12 rounded-2xl bg-white/55 py-4 backdrop-blur-sm sm:hidden"
            stagger={0.08}
            delay={0.15}
          >
            {FACTS.map((fact) => (
              <StaggerItem key={fact.label} distance={14}>
                <span className="block font-sans-plomb text-[22px] leading-none font-semibold tracking-[-0.015em]">
                  {fact.value}
                </span>
                <span className="mt-1.5 block font-noi-grotesk text-[13px] leading-[1.2] tracking-[-0.015em] text-neutral-50">
                  {fact.label}
                </span>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <div className="mt-8 flex w-full flex-col gap-4 md:mt-10 lg:flex-row">
            <HeroCard
              title="Start building today"
              body="Join the program and build real applications from your very first week, with no prior AI experience."
              cta="Join now"
              variant="solid"
              delay={0.75}
              // extra={<NextWebinarBadge className="self-start" />}
            />
            <HeroCard
              title="Talk to our team"
              body="Not sure where to start? We'll walk you through the program and what you'll build."
              cta="Get the brochure"
              variant="outline"
              delay={0.85}
              action="brochure"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
