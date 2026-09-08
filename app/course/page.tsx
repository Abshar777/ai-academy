import type { Metadata } from "next";
import Link from "next/link";
import { CURRICULUM, CURRICULUM_TOPIC_COUNT } from "@/lib/curriculum";
import { CheckIcon } from "@/components/check-icon";
import { PlanPrice } from "@/components/plan-price";
import { BrochureLink } from "@/components/brochure-link";
import { Reveal } from "@/components/reveal";
import { SplitReveal } from "@/components/split-reveal";
import { StaggerGroup, StaggerItem } from "@/components/stagger";

export const metadata: Metadata = {
  title: "Full Curriculum",
  description: `Every module and topic in the Delta AI Academy programme — ${CURRICULUM.length} modules, ${CURRICULUM_TOPIC_COUNT} topics, from how AI models work to shipping a deployed full-stack application.`,
};

function ModuleCard({
  module,
  index,
}: {
  module: (typeof CURRICULUM)[number];
  index: number;
}) {
  return (
    <Reveal className="rounded-3xl bg-neutral-10 p-6 [--translateY-from:12%] md:p-10">
      <div className="flex flex-col gap-3 border-b border-neutral-90/10 pb-6 md:flex-row md:items-baseline md:justify-between md:gap-6">
        <div className="flex flex-col gap-3">
          <span className="font-noi-grotesk text-[14px] leading-[1.4] font-medium tracking-[-0.015em] text-neutral-50">
            Module {String(index + 1).padStart(2, "0")}
          </span>
          <h2 className="font-noi-grotesk text-[26px] leading-[1.1] tracking-[-0.025em] md:text-[32px]">
            {module.title}
          </h2>
        </div>
        <span className="shrink-0 font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
          {module.topics.length} topics
        </span>
      </div>

      <p className="mt-6 max-w-2xl font-noi-grotesk text-[17px] leading-[1.45] tracking-[-0.015em] text-pretty text-neutral-50">
        {module.blurb}
      </p>

      <StaggerGroup as="ul" className="mt-8 flex list-none flex-col gap-4" stagger={0.05}>
        {module.topics.map((topic) => (
          <StaggerItem
            as="li"
            key={topic.label}
            distance={12}
            className="flex max-w-full items-start gap-3"
          >
            <CheckIcon className="size-3 shrink-0 translate-y-2" />
            <span className="shrink font-noi-grotesk text-[16px] leading-[1.45] tracking-[-0.015em]">
              {topic.label}
            </span>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </Reveal>
  );
}

export default function CoursePage() {
  return (
    <main className="page-surface overflow-x-clip">
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 pt-32 pb-12 md:items-center md:pt-40 md:pb-16">
        <Reveal
          as="span"
          className="inline-block rounded-full bg-neutral-10 px-5 py-3 text-[16px] leading-[1.5] [--translateY-from:20%]"
        >
          Full curriculum
        </Reveal>
        <SplitReveal
          as="h1"
          delay={0.1}
          className="max-w-3xl font-noi-grotesk text-[36px] leading-[1.1] tracking-[-0.025em]  md:text-center md:text-[52px] md:leading-[1.05]"
        >
          Everything you&rsquo;ll learn, module by module
        </SplitReveal>
        <Reveal
          as="p"
          delay={0.2}
          className="max-w-xl font-noi-grotesk text-[18px] leading-[1.4] tracking-[-0.015em] text-pretty text-neutral-50 [--translateY-from:20%] md:text-center md:text-[20px]"
        >
          {CURRICULUM.length} modules, {CURRICULUM_TOPIC_COUNT} topics — from how AI models
          actually work through to a deployed full-stack application, on the one <PlanPrice />
          plan.
        </Reveal>
        <Reveal
          as="span"
          delay={0.3}
          className="inline-block rounded-full bg-neutral-10 px-4 py-2 font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-neutral-50 [--translateY-from:15%]"
        >
          Taught in English & Malayalam , with live support in Malayalam
        </Reveal>
      </section>

      <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-20 md:pb-32">
        {CURRICULUM.map((module, i) => (
          <ModuleCard key={module.title} module={module} index={i} />
        ))}
      </section>

      <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-24 text-center md:pb-32">
        <SplitReveal
          as="h2"
          className="max-w-lg font-noi-grotesk text-[28px] leading-[1.15] tracking-[-0.025em]  md:text-[34px]"
        >
          Same curriculum, one price
        </SplitReveal>
        <Reveal
          as="p"
          delay={0.1}
          className="max-w-md font-noi-grotesk text-[17px] leading-[1.4] tracking-[-0.015em] text-neutral-50 [--translateY-from:15%]"
        >
          Every module above is included in the <PlanPrice /> plan — no tiers, nothing locked
          behind an upgrade.
        </Reveal>
        <Reveal
          delay={0.2}
          className="mt-2 flex w-full max-w-sm flex-col gap-3 [--translateY-from:15%] sm:w-auto sm:flex-row"
        >
          <Link
            href="/order"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-neutral-90 px-8 text-[16px] leading-none font-medium tracking-[-0.015em] text-white transition duration-150 ease-in-out hover:scale-[1.02] hover:bg-neutral-100 sm:w-auto"
          >
            Join now
          </Link>
          <BrochureLink className="inline-flex h-12 w-full items-center justify-center rounded-full border border-neutral-90 px-8 text-[16px] leading-none font-medium tracking-[-0.015em] transition duration-150 ease-in-out hover:bg-neutral-90/8 sm:w-auto">
            Get the brochure
          </BrochureLink>
        </Reveal>
        <Reveal
          as="p"
          delay={0.3}
          className="font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-neutral-50 [--translateY-from:10%]"
        >
          Pay in full, or split it with Tabby or Tamara at enrolment. Razorpay accepted too.
        </Reveal>
      </section>
    </main>
  );
}
