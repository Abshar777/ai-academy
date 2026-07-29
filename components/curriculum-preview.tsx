import Link from "next/link";
import { CURRICULUM, CURRICULUM_TOPIC_COUNT } from "@/lib/curriculum";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { StaggerGroup, StaggerItem } from "./stagger";

/**
 * Homepage teaser for the /course page — a preview, not a duplicate. Full
 * topic lists live on /course; this only shows enough of each module (title,
 * topic count, first two topics) to prove the depth is real, then sends
 * anyone who wants the rest there rather than re-listing all 26 topics twice.
 */

function ModulePreviewCard({
  module,
  index,
}: {
  module: (typeof CURRICULUM)[number];
  index: number;
}) {
  const preview = module.topics.slice(0, 2);
  const remaining = module.topics.length - preview.length;

  return (
    <StaggerItem
      distance={20}
      className="flex flex-col gap-4 rounded-3xl bg-neutral-10 p-7 md:p-8"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-noi-grotesk text-[13px] leading-[1.4] font-medium tracking-[-0.015em] text-neutral-50">
          Module {String(index + 1).padStart(2, "0")}
        </span>
        <span className="shrink-0 font-noi-grotesk text-[13px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
          {module.topics.length} topics
        </span>
      </div>
      <h3 className="font-noi-grotesk text-[20px] leading-[1.15] tracking-[-0.025em]">
        {module.title}
      </h3>
      <ul className="flex list-none flex-col gap-1.5">
        {preview.map((topic) => (
          <li
            key={topic.label}
            className="font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-neutral-50"
          >
            {topic.label}
          </li>
        ))}
        {remaining > 0 && (
          <li className="font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-neutral-50/70">
            +{remaining} more
          </li>
        )}
      </ul>
    </StaggerItem>
  );
}

export function CurriculumPreview() {
  return (
    <section id="curriculum" className="py-20 lg:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 pb-16 lg:items-center">
        <Reveal
          as="span"
          className="inline-block rounded-full bg-neutral-10 px-5 py-3 text-[16px] leading-[1.5] [--translateY-from:20%]"
        >
          Curriculum
        </Reveal>
        <SplitReveal
          as="h2"
          delay={0.15}
          className="max-w-3xl font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] text-balance [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:text-center lg:[--translateY-from:40%] xl:text-[48px]"
        >
          The curriculum, at a glance
        </SplitReveal>
        <Reveal
          as="p"
          delay={0.25}
          className="max-w-xl font-noi-grotesk text-[18px] leading-[1.35] tracking-[-0.015em] text-pretty text-neutral-50 [--translateY-from:20%] lg:text-center"
        >
          {CURRICULUM.length} modules, {CURRICULUM_TOPIC_COUNT} topics — every one of them
          included in the one AED&nbsp;99 plan.
        </Reveal>
      </div>

      <StaggerGroup
        className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4"
        stagger={0.08}
      >
        {CURRICULUM.map((module, i) => (
          <ModulePreviewCard key={module.title} module={module} index={i} />
        ))}
      </StaggerGroup>

      <Reveal className="mx-auto mt-10 flex max-w-6xl justify-center [--translateY-from:15%]">
        <Link
          href="/course"
          className="inline-flex h-12 items-center justify-center rounded-full bg-neutral-90 px-8 text-[16px] leading-none font-medium tracking-[-0.015em] text-white transition duration-150 ease-in-out hover:scale-[1.02] hover:bg-neutral-100"
        >
          See the full curriculum
        </Link>
      </Reveal>
    </section>
  );
}
