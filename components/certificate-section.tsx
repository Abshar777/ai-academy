import { CURRICULUM_TOPIC_COUNT } from "@/lib/curriculum";
import { PROGRAMME_NAME } from "@/lib/site";
import { DeltaWordmark } from "./delta-logo";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";

/**
 * Trust/value section: every graduate gets a completion certificate, not just
 * four deployed apps.
 *
 * The card is an illustrative sample — the name, date and certificate ID are
 * placeholders, which the caption under it says plainly. The lesson count is
 * real, read from lib/curriculum.ts so it can't drift from the syllabus.
 */

const SAMPLE_ISSUE_DATE = "15 June 2026";
const SAMPLE_CERTIFICATE_ID = "DAA-2026-4C81-7F30-92B5";

/** Round stamp on the ribbon: brand text curved around a starburst. */
function CertificateSeal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <path id="seal-arc" d="M60 60 m-42 0 a42 42 0 1 1 84 0 a42 42 0 1 1 -84 0" />
      </defs>

      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <circle cx="60" cy="60" r="47" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.35" />

      <text
        fill="currentColor"
        fontSize="9.5"
        letterSpacing="2.4"
        fontWeight="600"
        opacity="0.85"
      >
        <textPath href="#seal-arc" startOffset="0%">
          DELTA AI ACADEMY · CERTIFIED · DELTA AI ACADEMY · CERTIFIED ·
        </textPath>
      </text>

      {/* Starburst, echoing the mark's radial motif. */}
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * Math.PI) / 6;
          const inner = 8;
          const outer = 19;
          return (
            <line
              key={i}
              x1={60 + Math.cos(angle) * inner}
              y1={60 + Math.sin(angle) * inner}
              x2={60 + Math.cos(angle) * outer}
              y2={60 + Math.sin(angle) * outer}
            />
          );
        })}
      </g>
      <circle cx="60" cy="60" r="5" fill="currentColor" />
    </svg>
  );
}

/** Hand-drawn signature line above the founder's title. */
function Signature({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 46" className={className} fill="none" aria-hidden>
      <path
        d="M4 33c10-4 16-19 22-25 5-5 7-2 5 5-3 10-11 24-6 26 4 2 11-10 15-17 3-5 5-4 4 2-1 7-4 14 0 15 5 1 12-13 16-19 2-4 4-3 3 2-2 8-3 13 1 14 6 2 15-9 21-16"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M96 30c9 3 24 4 38-2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-noi-grotesk text-[11px] leading-none tracking-[-0.01em] text-neutral-50 sm:text-[12px]">
        {label}
      </span>
      <span className="font-noi-grotesk text-[14px] leading-none font-semibold tracking-[-0.015em] text-neutral-90 sm:text-[16px]">
        {value}
      </span>
    </div>
  );
}

function CertificateCard() {
  return (
    <div className="relative mx-auto w-full max-w-[860px] overflow-hidden rounded-2xl bg-[#faf8f4] shadow-[0_32px_70px_-28px_rgba(20,21,28,0.3)] ring-1 ring-neutral-90/8">
      {/* The classic inset rule, held clear of the ribbon on the right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-2.5 rounded-xl border border-neutral-90/10 sm:inset-3.5"
      />

      {/* Vertical brand ribbon, notched at the foot. Hangs from the top edge
          the way a real seal ribbon would. */}
      <div
        aria-hidden
        className="absolute top-0 right-8 z-10 flex w-[78px] flex-col items-center gap-3 bg-lime-30 px-2 pt-4 pb-9 text-neutral-90 sm:right-14 sm:w-[104px] sm:gap-4 sm:pt-6 sm:pb-12"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%)" }}
      >
        <span className="text-center font-noi-grotesk text-[9px] leading-[1.3] font-semibold tracking-[0.06em] sm:text-[11px]">
          Delta official
          <br />
          certificate
        </span>
        <CertificateSeal className="size-[52px] sm:size-[68px]" />
      </div>

      {/* Certificate ID, set vertically down the outer edge. Only from `sm`:
          rotated, the string is taller than a phone-width card, so it ends up
          clipped and running through the body copy. Phones get it as a plain
          line in the footer instead. */}
      <span
        aria-hidden
        className="absolute top-1/2 right-3 hidden origin-center -translate-y-1/2 rotate-90 font-noi-grotesk text-[10px] leading-none tracking-[0.08em] whitespace-nowrap text-neutral-50 sm:block"
      >
        Certificate ID: {SAMPLE_CERTIFICATE_ID}
      </span>

      <div className="relative flex flex-col gap-6 px-6 py-7 pr-[124px] sm:gap-8 sm:px-10 sm:py-10 sm:pr-[190px]">
        {/* self-start matters: as a flex item in a column, the default
            align-items:stretch would blow the logo out to the card's full
            width and w-auto can't hold it back. */}
        <DeltaWordmark className="h-6 w-auto self-start sm:h-7" priority={false} />

        <div className="flex flex-col gap-2 sm:gap-3">
          <p className="font-noi-grotesk text-[13px] leading-[1.4] tracking-[-0.015em] text-neutral-50 sm:text-[15px]">
            <span className="font-semibold text-neutral-90">Your Name</span> successfully
            completed
          </p>

          <h3 className="font-noi-grotesk text-[24px] leading-[1.1] font-semibold tracking-[-0.025em] text-neutral-90 sm:text-[34px]">
            {PROGRAMME_NAME}
          </h3>

          <p className="max-w-md font-noi-grotesk text-[12.5px] leading-[1.6] tracking-[-0.01em] text-neutral-50 sm:text-[14px]">
            By completing this programme, the learner has demonstrated practical skills in
            AI-assisted software development and shipped four deployed applications across
            full-stack, mobile, backend and database work.
          </p>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-neutral-90/10 pt-5 sm:pt-6">
          <div className="flex items-end gap-4 sm:gap-7">
            <MetaField label="Course length" value={`${CURRICULUM_TOPIC_COUNT} lessons`} />
            <span aria-hidden className="h-8 w-px shrink-0 bg-neutral-90/12" />
            <MetaField label="Date of issue" value={SAMPLE_ISSUE_DATE} />
          </div>

          <div className="hidden flex-col items-center gap-1 sm:flex">
            <Signature className="h-9 w-[120px] text-[#1c3faa]" />
            <span className="w-full border-t border-neutral-90/25 pt-1.5 text-center font-noi-grotesk text-[11px] leading-none tracking-[-0.01em] text-neutral-50">
              Delta AI Academy
            </span>
          </div>
        </div>

        {/* The ID the edge can't carry on a narrow card. */}
        <span className="font-noi-grotesk text-[10px] leading-none tracking-[0.06em] text-neutral-50 sm:hidden">
          Certificate ID: {SAMPLE_CERTIFICATE_ID}
        </span>
      </div>
    </div>
  );
}

export function CertificateSection() {
  return (
    <section id="certificate" className="py-20 lg:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 pb-14 text-center lg:pb-16">
        <Reveal
          as="span"
          className="inline-block rounded-full bg-neutral-10 px-5 py-3 text-[16px] leading-[1.5] [--translateY-from:20%]"
        >
          Certificate
        </Reveal>
        <SplitReveal
          as="h2"
          delay={0.15}
          className="max-w-3xl font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em]  [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:[--translateY-from:40%] xl:text-[48px]"
        >
          Finish with a certificate, not just a folder of code
        </SplitReveal>
        <Reveal
          as="p"
          delay={0.25}
          className="max-w-xl font-noi-grotesk text-[18px] leading-[1.35] tracking-[-0.015em] text-pretty text-neutral-50 [--translateY-from:20%]"
        >
          Every graduate gets a Delta AI Academy certificate of completion — proof you shipped
          four real, deployed applications, not just watched tutorials.
        </Reveal>
      </div>

      <Reveal className="[--translateY-from:20%]">
        <CertificateCard />
      </Reveal>

      <p className="mx-auto mt-4 max-w-6xl text-center font-noi-grotesk text-[13px] tracking-[-0.01em] text-neutral-50">
        Sample certificate — yours is issued with your name, date and a unique certificate ID on
        completion.
      </p>
    </section>
  );
}
