import Image from "next/image";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";

/**
 * The tools and platforms the programme actually uses. Marks are the official
 * brand logos with each brand's own colour; they're shown to identify the
 * tools taught, not to imply any endorsement.
 *
 * Sources: simple-icons (monochrome brand marks) and lovable.dev for Lovable.
 */
const TOOLS = [
  // The four named in the brochure
  { name: "Lovable", file: "lovable.svg", colour: null },
  { name: "ChatGPT Codex", file: "openai.svg", colour: "#000000" },
  { name: "Claude", file: "claude.svg", colour: "#D97757" },
  { name: "Google AI Studio", file: "googlegemini.svg", colour: "#8E75B2" },
  // Coding agents and browser-based builders
  { name: "Cursor", file: "cursor.svg", colour: "#000000" },
  { name: "GitHub Copilot", file: "githubcopilot.svg", colour: "#000000" },
  { name: "v0", file: "v0.svg", colour: "#000000" },
  { name: "Replit", file: "replit.svg", colour: "#F26207" },
  { name: "Windsurf", file: "windsurf.svg", colour: "#0B100F" },
  // The brochure's research and automation categories
  { name: "Perplexity", file: "perplexity.svg", colour: "#1FB8CD" },
  { name: "n8n", file: "n8n.svg", colour: "#EA4B71" },
  { name: "Hugging Face", file: "huggingface.svg", colour: "#FFD21E" },
];

const HEADLINE =
  "Modern developers use AI tools to build faster and more efficiently";

function ToolTile({ name, file, colour }: (typeof TOOLS)[number]) {
  return (
    <div className="flex flex-[0_0_auto] items-center justify-center px-2">
      <div className="flex h-31 w-[228px] flex-col items-center justify-center gap-4 rounded-2xl bg-neutral-10 px-6 md:h-36">
        {/* Simple-icons marks are single-colour paths, so the brand colour is
            applied by masking. Lovable's own SVG is already full colour. */}
        {colour ? (
          <span
            aria-hidden
            className="block size-8"
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
            width={32}
            height={32}
            className="size-8 object-contain"
          />
        )}
        <span className="text-center font-noi-grotesk text-[16px] leading-[1.2] tracking-[-0.015em] text-balance">
          {name}
        </span>
      </div>
    </div>
  );
}

export function AiTools() {
  return (
    <div id="tools" className="">
      <section className="flex flex-col gap-10 lg:items-center xl:gap-20">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-8 px-6 lg:items-center">
          <Reveal
            as="span"
            className="inline-block rounded-full bg-neutral-10 px-5 py-3 text-[16px] leading-[1.5] [--translateY-from:20%]"
          >
            AI tools
          </Reveal>
          <SplitReveal
            as="h2"
            delay={0.15}
            className="max-w-2xl font-noi-grotesk text-[28px] leading-[1.15] tracking-[-0.025em] text-balance [--translateY-from:20%] md:text-[36px] lg:max-w-none lg:text-center lg:[--translateY-from:40%] xl:text-[40px]"
          >
            {HEADLINE}
          </SplitReveal>
        </div>

        {/* Seamless marquee: the strip is duplicated, so translating it exactly
            -50% lands the copy where the original started. */}
        <Reveal className="w-screen [--translateY-from:12%]">
          <div className="pointer-events-none overflow-hidden">
            <div className="marquee-track flex w-max">
              {[0, 1].map((copy) => (
                <div className="flex" key={copy} aria-hidden={copy === 1}>
                  {TOOLS.map((tool) => (
                    <ToolTile key={tool.name} {...tool} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
