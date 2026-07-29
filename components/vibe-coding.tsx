import Image from "next/image";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { StaggerGroup, StaggerItem } from "./stagger";

/** The agents you actually build with on the programme. */
const AGENTS = [
  { name: "ChatGPT Codex", file: "openai.svg", colour: "#000000" },
  { name: "Claude Code", file: "claudecode.svg", colour: "#D97757" },
  { name: "Lovable", file: "lovable.svg", colour: null },
  { name: "Google AI Studio", file: "googlegemini.svg", colour: "#8E75B2" },
  { name: "Kimi", file: "kimi.svg", colour: "#000000" },
];

const STEPS = [
  {
    step: "01",
    title: "Describe it",
    body: "You explain the app you want in plain language — the screens, the data, what it should do. No syntax, no boilerplate.",
  },
  {
    step: "02",
    title: "The agent builds it",
    body: "Codex, Claude Code, Lovable, AI Studio or Kimi writes the code and wires it together while you watch it take shape.",
  },
  {
    step: "03",
    title: "You direct and ship it",
    body: "You review what it produced, tell it what to change, and push the result live. Judgement is the skill — not typing.",
  },
];

function AgentMark({ name, file, colour }: (typeof AGENTS)[number]) {
  return (
    <StaggerItem
      as="li"
      distance={18}
      className="flex items-center gap-3 rounded-full bg-neutral-10 px-5 py-3"
    >
      {colour ? (
        <span
          aria-hidden
          className="block size-6 shrink-0"
          style={{
            backgroundColor: colour,
            WebkitMaskImage: `url(/tools/${file})`,
            maskImage: `url(/tools/${file})`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      ) : (
        <Image
          src={`/tools/${file}`}
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0 object-contain"
        />
      )}
      <span className="font-noi-grotesk text-[16px] leading-[1.3] tracking-[-0.015em] whitespace-nowrap">
        {name}
      </span>
    </StaggerItem>
  );
}

export function VibeCoding() {
  return (
    <section id="how-we-teach" className="py-20 lg:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 pb-16 lg:items-center">
        <Reveal
          as="span"
          className="inline-block rounded-full bg-neutral-10 px-5 py-3 text-[16px] leading-[1.5] [--translateY-from:20%]"
        >
          How we teach
        </Reveal>
        <SplitReveal
          as="h2"
          delay={0.15}
          className="max-w-4xl font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] text-balance [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:text-center lg:[--translateY-from:40%] xl:text-[48px]"
        >
          We don&rsquo;t teach you to write code. We teach you to build with AI.
        </SplitReveal>
        <Reveal
          as="p"
          delay={0.25}
          className="max-w-2xl font-noi-grotesk text-[20px] leading-[1.35] tracking-[-0.015em] text-balance text-neutral-50 [--translateY-from:20%] lg:text-center"
        >
          No syntax drills, no memorising APIs. You work the way developers
          actually work now — describing what you want and directing an AI agent
          until it is built and live.
        </Reveal>
      </div>

      {/* Gradient frame, same treatment as the approach section. */}
      <Reveal className="delta-gradient-frame rounded-[32px] p-3 [--translateY-from:15%] md:p-6">
        <StaggerGroup
          className="grid gap-3 md:gap-6 lg:grid-cols-3"
          stagger={0.12}
        >
          {STEPS.map((item) => (
            <StaggerItem
              key={item.step}
              distance={36}
              className="flex flex-col gap-4 rounded-3xl bg-white p-8 md:p-10"
            >
              <span className="font-sans-plomb text-[40px] leading-[0.9] font-semibold tracking-[-0.015em] text-neutral-90/25">
                {item.step}
              </span>
              <SplitReveal
                as="h3"
                className="font-noi-grotesk text-[26px] leading-[1.1] tracking-[-0.025em] md:text-[28px]"
              >
                {item.title}
              </SplitReveal>
              <p className="font-noi-grotesk text-[17px] leading-[1.45] tracking-[-0.015em] text-pretty">
                {item.body}
              </p>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <div className="mt-3 rounded-3xl bg-white p-8 md:mt-6 md:p-10">
          <SplitReveal
            as="h3"
            className="font-noi-grotesk text-[26px] leading-[1.1] tracking-[-0.025em] md:text-[28px]"
          >
            The agents you build with
          </SplitReveal>
          <StaggerGroup
            as="ul"
            className="mt-8 flex list-none flex-wrap gap-3"
            stagger={0.06}
          >
            {AGENTS.map((agent) => (
              <AgentMark key={agent.name} {...agent} />
            ))}
          </StaggerGroup>
          <SplitReveal
            as="p"
            className="mt-8 font-noi-grotesk text-[17px] leading-[1.45] tracking-[-0.015em] text-neutral-50"
          >
            You still finish with four deployed applications and a portfolio —
            you just get there by directing agents rather than writing every
            line yourself.
          </SplitReveal>
        </div>
      </Reveal>
    </section>
  );
}
