import { DeltaMark, DeltaWordmark } from "./delta-logo";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";

/**
 * Trust/value section: every graduate gets a completion certificate, not
 * just four deployed apps. The card below is an illustrative sample (marked
 * "Sample" on the ribbon) — the name, cohort and certificate ID are
 * placeholders, not a real issued certificate.
 */

function CertificateSeal() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex size-14 items-center justify-center rounded-full bg-neutral-90 ring-4 ring-lime-30/40 sm:size-16">
        <DeltaMark variant="white" className="h-6 w-auto sm:h-7" />
      </div>
      <span className="font-noi-grotesk text-[10px] leading-[1.2] font-medium tracking-[0.1em] text-neutral-50 uppercase sm:text-[11px]">
        Verified
      </span>
    </div>
  );
}

function CertificateCard() {
  return (
    <div className="relative mx-auto w-full max-w-[720px] overflow-hidden rounded-2xl bg-white p-6 shadow-[0_32px_70px_-28px_rgba(0,0,0,0.28)] ring-1 ring-neutral-90/8 sm:p-10 md:p-12">
      {/* Inner rule — the classic certificate double-border, offset from the
          card edge so the ribbon in the corner can sit on top of it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 rounded-xl border border-neutral-90/12 sm:inset-4"
      />

      {/* Marks this as illustrative rather than a real issued certificate. */}
      <div
        aria-hidden
        className="absolute top-6 -right-11 w-40 rotate-45 bg-neutral-90 py-1 text-center font-noi-grotesk text-[10px] font-semibold tracking-[0.25em] text-white uppercase sm:top-7 sm:-right-12 sm:w-44"
      >
        Sample
      </div>

      <div className="relative flex flex-col items-center gap-5 text-center sm:gap-6">
        <DeltaWordmark className="h-6 w-auto sm:h-7" />

        <div className="flex flex-col gap-2">
          <span className="font-noi-grotesk text-[11px] font-medium tracking-[0.25em] text-neutral-50 uppercase sm:text-[12px]">
            Certificate of Completion
          </span>
          <p className="font-noi-grotesk text-[15px] tracking-[-0.015em] text-neutral-50 sm:text-[16px]">
            This certifies that
          </p>
        </div>

        <span className="border-b-2 border-lime-30 px-4 pb-2 font-sans-plomb text-[32px] leading-none tracking-[-0.015em] text-pretty sm:text-[42px]">
          Your Name
        </span>

        <p className="max-w-md font-noi-grotesk text-[14px] leading-[1.55] tracking-[-0.015em] text-pretty text-neutral-50 sm:text-[15px]">
          has successfully completed the Delta AI Academy programme, building four deployed
          applications across full-stack, mobile, backend and database development.
        </p>

        <div className="mt-2 flex w-full items-end justify-between gap-4 border-t border-neutral-90/10 pt-6 text-left sm:mt-4">
          <div className="flex flex-col gap-1">
            <span className="font-sans-plomb text-[14px] leading-[1.1] tracking-[-0.015em] sm:text-[15px]">
              Cohort 2026
            </span>
            <span className="font-noi-grotesk text-[11px] leading-[1.2] tracking-[-0.01em] text-neutral-50 sm:text-[12px]">
              Issue date
            </span>
          </div>

          <CertificateSeal />

          <div className="flex flex-col items-end gap-1 text-right">
            <span className="font-sans-plomb text-[14px] leading-[1.1] tracking-[-0.015em] sm:text-[15px]">
              Delta AI Academy
            </span>
            <span className="font-noi-grotesk text-[11px] leading-[1.2] tracking-[-0.01em] text-neutral-50 sm:text-[12px]">
              Issuing organisation
            </span>
          </div>
        </div>
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
          className="max-w-3xl font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] text-balance [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:[--translateY-from:40%] xl:text-[48px]"
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
        Sample certificate — yours is issued with your name and cohort on completion.
      </p>
    </section>
  );
}
