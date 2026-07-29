import { ContactButton } from "./contact-dialog";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";

/** Fade-up travel, per breakpoint. Read by <Reveal>. */
const TRAVEL = "[--translateY-from:20%] lg:[--translateY-from:40%]";

type HeroCardProps = {
  title: string;
  body: string;
  cta: string;
  variant: "outline" | "solid";
  /** Seconds after the curtain lifts. Cards arrive one after the other. */
  delay: number;
};

function HeroCard({ title, body, cta, variant, delay }: HeroCardProps) {
  return (
    <Reveal
      hover
      delay={delay}
      className="flex flex-1 flex-col gap-6 rounded-2xl bg-neutral-10 p-7 text-left [--translateY-from:20%] md:p-10 lg:basis-0"
    >
      <h2 className="font-noi-grotesk text-[26px] leading-[1.1] tracking-[-0.025em] text-pretty md:text-[32px]">
        {title}
      </h2>
      <p className="font-noi-grotesk text-[16px] leading-[1.4] tracking-[-0.015em] text-pretty">
        {body}
      </p>
      <div className="mt-auto">
        <ContactButton
          source="hero"
          className={
            "group inline-flex h-10 items-center justify-center rounded-lg px-4 text-[16px] leading-[1.1] font-medium tracking-[-0.015em] transition duration-150 ease-in-out " +
            (variant === "solid"
              ? "bg-lime-30 text-black hover:bg-lime-40"
              : "border border-neutral-90 hover:bg-neutral-90/8")
          }
        >
          {cta}
        </ContactButton>
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
      <section className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-6 pt-28 pb-16 md:pt-32 lg:gap-20">
        <div className="flex flex-col items-center text-center">
          <Reveal
            as="span"
            className={`inline-block rounded-full bg-neutral-10 md:px-5 text-xs px-4 py-3 md:py-3 md:text-[16px] leading-[1.5] ${TRAVEL}`}
          >
            Delta AI Academy
          </Reveal>

          {/* Display line unfurls character by character out of its line
              masks once the curtain lifts. */}
          <SplitReveal
            as="h1"
            unit="chars"
            start="intro"
            delay={0.15}
            className="max-w-[820px] pb-2 font-sans-plomb text-[52px] leading-[0.92] font-semibold tracking-[-0.015em] uppercase sm:text-[76px] sm:leading-[0.9] md:pb-4 md:text-[110px] lg:text-[120px] xl:text-[150px]"
          >
            Build AI powered applications
          </SplitReveal>

          <SplitReveal
            as="p"
            start="intro"
            delay={0.5}
            className="mt-6 md:max-w-md font-noi-grotesk text-[19px] leading-[1.25] tracking-[-0.015em] text-balance md:mt-10 md:text-[24px] md:leading-[1.1]"
          >
            Even if you've never coded before. We make AI development
            simple and accessible for beginners.
          </SplitReveal>

          <div className="mt-8 flex w-full flex-col gap-4 md:mt-10 lg:flex-row">
            <HeroCard
              title="Start building today"
              body="Join the program and build real applications from your very first week, with no prior AI experience."
              cta="Join now"
              variant="solid"
              delay={0.75}
            />
            <HeroCard
              title="Talk to our team"
              body="Not sure where to start? We'll walk you through the program and what you'll build."
              cta="Get the brochure"
              variant="outline"
              delay={0.85}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
