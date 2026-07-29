import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { CheckIcon } from "./check-icon";

/**
 * Replaces the FAQ block. The brochure has no questions and answers, so this
 * reuses the same two-column layout for "What You Will Achieve".
 */
const OUTCOMES = [
  "Build real web and mobile applications",
  "Understand AI powered development",
  "Create portfolio projects",
  "Learn how to deploy applications online",
  "Gain confidence to build your own ideas",
];

export function OutcomesSection() {
  return (
    <section
      id="outcomes"
      className="mx-auto grid max-w-5xl grid-cols-12 py-16 lg:py-24"
    >
      <div className="col-span-12 py-6 lg:col-span-3 lg:col-start-2 lg:py-0">
        <SplitReveal
          as="h2"
          className="font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] text-balance [--translateY-from:20%] md:text-[44px] md:leading-[1] xl:text-[48px]"
        >
          What you will achieve
        </SplitReveal>
      </div>

      <div className="col-span-12 lg:col-span-7 lg:col-start-5">
        <ul className="flex list-none flex-col gap-y-6">
          {OUTCOMES.map((outcome, i) => (
            <Reveal
              key={outcome}
              as="span"
              delay={0.1 * i}
              className="block border-b border-current/15 pb-6 last:border-b-0 [--translateY-from:20%]"
            >
              <span className="flex max-w-full items-start gap-4">
                <CheckIcon className="size-3 shrink-0 translate-y-2" />
                <span className="font-noi-grotesk text-[18px] leading-[1.4] tracking-[-0.015em]">
                  {outcome}
                </span>
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
