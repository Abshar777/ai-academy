import Image from "next/image";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";

/**
 * SAMPLE QUOTES — the photos and names are real, the words are not.
 *
 * The brochure carries no testimonials, so the quotes were drafted to describe
 * what the programme actually does. They must be replaced with what each of
 * these people actually said, with their permission, before this goes live.
 */
const STORIES = [
  {
    quote:
      "I had never written a line of code before I started. By the third week my portfolio site was live at my own URL.",
    name: "Jazeem",
    role: "Cohort 2026",
    avatar: "/avatars/jazeem.jpg",
  },
  {
    quote:
      "The AI tools do the heavy lifting, but you still understand what you are shipping. That was the part I did not expect.",
    name: "Riziwin",
    role: "Cohort 2026",
    avatar: "/avatars/riziwin.jpg",
  },
  {
    quote:
      "I finished with four applications deployed and a GitHub history I could actually show people.",
    name: "Sajjin",
    role: "Cohort 2026",
    avatar: "/avatars/sajjin.jpg",
  },
  {
    quote:
      "Going from the web app to the same thing in React Native took days, not months. Seeing it run on my own phone was the moment it clicked.",
    name: "Abshar",
    role: "Cohort 2026",
    avatar: "/avatars/abshar.jpg",
  },
  {
    quote:
      "The backend was the part I was dreading. Building the API alongside the app made it far less abstract than I expected.",
    name: "Nithin",
    role: "Cohort 2026",
    avatar: "/avatars/nithin.jpg",
  },
  {
    quote:
      "Every project ends at a real URL. That is what made the difference when I started showing my work to people.",
    name: "Thazim",
    role: "Cohort 2026",
    avatar: "/avatars/thazim.jpg",
  },
];

/** One full pass of the duplicated track. 6 cards × 464px ≈ 2784px per copy. */
const SCROLL_DURATION = "70s";

function StoryCard({ story }: { story: (typeof STORIES)[number] }) {
  return (
    // Card width is capped against the viewport: at 440px fixed, a phone shows
    // neither edge of a card and every quote is cut off mid-line. Capping it
    // leaves the next card peeking, which also reads as scrollable.
    <figure className="flex h-auto min-h-[300px] w-[min(82vw,440px)] flex-[0_0_auto] flex-col justify-between gap-8 rounded-3xl bg-neutral-10 p-6 sm:h-[400px] sm:min-h-0 sm:p-10">
      <blockquote className="font-noi-grotesk text-[19px] leading-[1.3] tracking-[-0.015em] text-pretty sm:text-[24px] sm:leading-[1.25]">
        &ldquo;{story.quote}&rdquo;
      </blockquote>

      <figcaption className="flex items-center gap-3 sm:gap-4">
        <Image
          src={story.avatar}
          alt=""
          width={96}
          height={96}
          className="size-11 shrink-0 rounded-full object-cover sm:size-12"
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-noi-grotesk text-[15px] leading-[1.3] font-medium tracking-[-0.015em] sm:text-[16px]">
            {story.name}
          </span>
          <span className="truncate font-noi-grotesk text-[15px] leading-[1.3] tracking-[-0.015em] text-neutral-50 sm:text-[16px]">
            {story.role}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  return (
    <section id="stories" className="py-14 sm:py-20 lg:py-32">
      <div className="flex flex-col items-center gap-8 sm:gap-10">
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
            className="font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] text-balance1 [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:text-center lg:[--translateY-from:40%] xl:text-[48px]"
          >
            Hear from our students
          </SplitReveal>
        </div>

        {/* Same seamless-marquee trick as the tool ticker: the row is duplicated,
            so translating exactly -50% lands the copy where the original began.
            Hovering holds it so a quote can actually be read. */}
        <Reveal className="stories-marquee w-screen overflow-hidden [--translateY-from:12%]">
          <div
            className="marquee-track flex w-max gap-4 px-3 sm:gap-6"
            style={{ ["--marquee-duration" as string]: SCROLL_DURATION }}
          >
            {[0, 1].map((copy) => (
              <div className="flex gap-4 sm:gap-6" key={copy} aria-hidden={copy === 1}>
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
