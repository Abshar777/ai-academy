import Link from "next/link";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { CheckIcon } from "./check-icon";
import { StaggerGroup, StaggerItem } from "./stagger";

const TRADITIONAL = {
  title: "The traditional way",
  intro:
    "Most routes into software start with months of theory before you build anything anyone can use.",
  points: [
    "Months of syntax and theory before your first real project",
    "Tutorials you follow along with but never ship",
    "You learn the tools, not how to build a product",
    "Nothing at the end you can actually show someone",
  ],
};

const DELTA = {
  title: "How you learn at Delta",
  intro:
    "You build from the first week. AI assisted tools carry the heavy lifting while you learn what you are actually shipping.",
  points: [
    "Build a real application from week one",
    "AI tools do the heavy lifting, you stay in control",
    "Four complete products, web and mobile",
    "Every project deployed to a URL you can share",
  ],
};

/** The five skill areas, straight from the curriculum. */
const STUDY = [
  { area: "Full stack", tools: "React.js" },
  { area: "Mobile", tools: "React Native, Expo" },
  { area: "Backend", tools: "Python FastAPI" },
  { area: "Database", tools: "MongoDB Atlas" },
  { area: "Deployment", tools: "Vercel, Hostinger VPS, Cloudflare" },
];

/** Muted cross, so the drawbacks read as the counterpart to the check marks. */
function CrossIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden className={className}>
      <path
        d="M6 1a5 5 0 1 1 0 10A5 5 0 0 1 6 1Zm1.72 3.22a.4.4 0 0 0-.57 0L6 5.37 4.85 4.22a.4.4 0 1 0-.57.57L5.43 5.94 4.28 7.09a.4.4 0 0 0 .57.57L6 6.51l1.15 1.15a.4.4 0 0 0 .57-.57L6.57 5.94l1.15-1.15a.4.4 0 0 0 0-.57Z"
        fill="#606384"
      />
    </svg>
  );
}

function CompareCard({
  title,
  intro,
  points,
  tone,
}: {
  title: string;
  intro: string;
  points: string[];
  tone: "muted" | "brand";
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 rounded-3xl bg-white p-8 md:p-10">
      <SplitReveal
        as="h3"
        className="font-noi-grotesk text-[28px] leading-[1.1] tracking-[-0.025em] md:text-[32px]"
      >
        {title}
      </SplitReveal>
      <SplitReveal
        as="p"
        delay={0.1}
        className={
          "font-noi-grotesk text-[17px] leading-[1.45] tracking-[-0.015em] text-pretty " +
          (tone === "muted" ? "text-neutral-50" : "")
        }
      >
        {intro}
      </SplitReveal>
      <StaggerGroup
        as="ul"
        className="flex list-none flex-col gap-5"
        stagger={0.07}
        delay={0.15}
      >
        {points.map((point) => (
          <StaggerItem
            as="li"
            key={point}
            distance={16}
            className="flex max-w-full items-start gap-4"
          >
            {tone === "brand" ? (
              <CheckIcon className="size-3 shrink-0 translate-y-2" />
            ) : (
              <CrossIcon className="size-3 shrink-0 translate-y-2" />
            )}
            <span
              className={
                "shrink font-noi-grotesk text-[16px] leading-[1.45] tracking-[-0.015em] " +
                (tone === "muted" ? "text-neutral-50" : "")
              }
            >
              {point}
            </span>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </div>
  );
}

export function WhyDelta() {
  return (
    <section id="approach">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 py-20 lg:items-center">
        <Reveal
          as="span"
          className="inline-block rounded-full bg-neutral-10 px-5 py-3 text-[16px] leading-[1.5] [--translateY-from:20%]"
        >
          Our approach
        </Reveal>
        <SplitReveal
          as="h2"
          delay={0.15}
          className="font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] text-balance1 [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:text-center lg:[--translateY-from:40%] xl:text-[48px]"
        >
          Why choose Delta AI Academy
        </SplitReveal>
      </div>

      {/* Gradient frame with the cards inset, so the brand colour reads as a
          border rather than a background behind the copy. */}
      <Reveal className="delta-gradient-frame rounded-[32px] p-3 [--translateY-from:15%] md:p-6">
        <div className="grid gap-3 md:gap-6 lg:grid-cols-2">
          <CompareCard {...TRADITIONAL} tone="muted" />
          <CompareCard {...DELTA} tone="brand" />
        </div>

        <div className="mt-3 rounded-3xl bg-white p-8 md:mt-6 md:p-10">
          <SplitReveal
            as="h3"
            className="font-noi-grotesk text-[28px] leading-[1.1] tracking-[-0.025em] md:text-[32px]"
          >
            What you study
          </SplitReveal>
          <StaggerGroup
            as="ul"
            className="mt-8 grid list-none gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5"
            delay={0.1}
          >
            {STUDY.map((item, i) => (
              <StaggerItem
                as="li"
                key={item.area}
                className="flex flex-col gap-2 border-t border-neutral-90/10 pt-5"
              >
                <span className="font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-noi-grotesk text-[20px] leading-[1.15] tracking-[-0.025em]">
                  {item.area}
                </span>
                <span className="font-noi-grotesk text-[15px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
                  {item.tools}
                </span>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <Link
            href="/course"
            className="mt-8 inline-flex items-center gap-2 font-noi-grotesk text-[16px] leading-[1.4] tracking-[-0.015em] underline decoration-neutral-90/25 underline-offset-4 transition-colors duration-150 hover:decoration-neutral-90"
          >
            See the full curriculum, module by module
            <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
              <path
                d="M5 3l6 5-6 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
