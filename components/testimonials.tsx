import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";

/**
 * SAMPLE COPY — drafted quotes, not real students.
 *
 * The brochure carries no testimonials, so there was nothing to source these
 * from. They describe what the programme actually does rather than inventing
 * outcomes, and the attribution is deliberately generic. Swap in real quotes —
 * with the student's permission — real names and real photos before launch.
 */
const STORIES = [
  {
    quote:
      "I had never written a line of code before I started. By the third week my portfolio site was live at my own URL.",
    name: "Student name",
    role: "Cohort 2026",
    initials: "SN",
  },
  {
    quote:
      "The AI tools do the heavy lifting, but you still understand what you are shipping. That was the part I did not expect.",
    name: "Student name",
    role: "Cohort 2026",
    initials: "SN",
  },
  {
    quote:
      "I finished with four applications deployed and a GitHub history I could actually show people.",
    name: "Student name",
    role: "Cohort 2026",
    initials: "SN",
  },
  {
    quote:
      "Going from the web app to the same thing in React Native took days, not months. Seeing it run on my own phone was the moment it clicked.",
    name: "Student name",
    role: "Cohort 2026",
    initials: "SN",
  },
  {
    quote:
      "The backend was the part I was dreading. Building the API alongside the app made it far less abstract than I expected.",
    name: "Student name",
    role: "Cohort 2026",
    initials: "SN",
  },
  {
    quote:
      "Every project ends at a real URL. That is what made the difference when I started showing my work to people.",
    name: "Student name",
    role: "Cohort 2026",
    initials: "SN",
  },
];

/** One full pass of the duplicated track. 6 cards × 464px ≈ 2784px per copy. */
const SCROLL_DURATION = "70s";

function StoryCard({ story }: { story: (typeof STORIES)[number] }) {
  return (
    <figure className="flex h-[400px] w-[440px] flex-[0_0_auto] flex-col justify-between rounded-3xl bg-neutral-10 p-10">
      <blockquote className="font-noi-grotesk text-[24px] leading-[1.25] tracking-[-0.015em] text-pretty">
        &ldquo;{story.quote}&rdquo;
      </blockquote>

      <figcaption className="flex items-center gap-4">
        {/* Gradient initials stand in until there are real photos. */}
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(140deg,#7af4ff_0%,#2aa8c9_100%)] font-noi-grotesk text-[15px] font-medium text-neutral-90"
        >
          {story.initials}
        </span>
        <span className="flex flex-col">
          <span className="font-noi-grotesk text-[16px] leading-[1.3] font-medium tracking-[-0.015em]">
            {story.name}
          </span>
          <span className="font-noi-grotesk text-[16px] leading-[1.3] tracking-[-0.015em] text-neutral-50">
            {story.role}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  return (
    <section id="stories" className="py-20 lg:py-32">
      <div className="flex flex-col items-center gap-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-8 px-6 lg:items-center">
          <Reveal
            as="span"
            className="inline-block rounded-full bg-neutral-10 px-5 py-3 text-[16px] leading-[1.5] [--translateY-from:20%]"
          >
            Testimonials
          </Reveal>

          <SplitReveal
            as="h2"
            delay={0.15}
            className="font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] text-balance [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:text-center lg:[--translateY-from:40%] xl:text-[48px]"
          >
            Hear from our students
          </SplitReveal>
        </div>

        {/* Same seamless-marquee trick as the tool ticker: the row is duplicated,
            so translating exactly -50% lands the copy where the original began.
            Hovering holds it so a quote can actually be read. */}
        <Reveal className="stories-marquee w-screen overflow-hidden [--translateY-from:12%]">
          <div
            className="marquee-track flex w-max gap-6 px-3"
            style={{ ["--marquee-duration" as string]: SCROLL_DURATION }}
          >
            {[0, 1].map((copy) => (
              <div className="flex gap-6" key={copy} aria-hidden={copy === 1}>
                {STORIES.map((story, i) => (
                  <StoryCard key={`${copy}-${i}`} story={story} />
                ))}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
