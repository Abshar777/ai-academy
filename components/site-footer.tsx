import Link from "next/link";
import { DeltaLogo, DeltaWordmark } from "./delta-logo";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { StaggerGroup, StaggerItem } from "./stagger";

const COLUMNS = [
  [
    {
      heading: "Program",
      links: ["What you'll learn", "Projects you'll build", "AI tools"],
    },
    { heading: "Outcomes", links: ["What you'll achieve", "Portfolio"] },
  ],
  [
    {
      heading: "Stack",
      links: ["React.js", "React Native", "Python FastAPI", "MongoDB Atlas"],
    },
    { heading: "Deployment", links: ["Vercel", "Hostinger VPS", "Cloudflare"] },
  ],
  [
    { heading: "Academy", links: ["About", "Brochure", "Contact"] },
    { heading: "Join", links: ["Enrol now", "Talk to our team"] },
  ],
];

const LEGAL = ["Privacy policy", "Accessibility", "Terms of service"];

/** Text badge rather than the Apple/Google artwork — same slot, no trademarks. */
function StoreBadge({ label }: { label: string }) {
  return (
    <Link
      href="#"
      className="inline-flex h-[46px] w-[140px] items-center justify-center rounded-lg border border-white/40 px-3 text-[13px] leading-tight font-medium transition-colors duration-150 hover:border-white"
    >
      {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="w-full overflow-hidden rounded-t-3xl  bg-neutral-90 px-4 pt-6  text-white md:p-6">
      <div className="mx-auto grid w-full pt-8 grid-cols-4 gap-x-4 gap-y-2 md:grid-cols-12">
        <div className="col-span-full grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-10">
              <SplitReveal
                as="h2"
                className="font-noi-grotesk text-[28px] leading-[1.1] tracking-[-0.025em] md:text-[40px] md:leading-[1] xl:text-[48px]"
              >
                Build AI powered
                <br />
                applications
              </SplitReveal>
              <StaggerGroup className="flex flex-wrap gap-3" delay={0.15}>
                <StaggerItem distance={16}>
                  <StoreBadge label="Download brochure" />
                </StaggerItem>
                <StaggerItem distance={16}>
                  <StoreBadge label="Join the program" />
                </StaggerItem>
              </StaggerGroup>
            </div>

         
          </div>
   <StaggerGroup className="grid w-full grid-cols-1 gap-x-4 gap-y-10 text-white sm:grid-cols-3 lg:max-w-[688px]" stagger={0.12}>
              {COLUMNS.map((column, i) => (
                <StaggerItem key={i} className="flex flex-col gap-10">
                  {column.map((group) => (
                    <div key={group.heading} className="flex flex-col gap-3">
                      <p className="font-noi-grotesk text-[16px] leading-[1.4] tracking-[-0.015em] text-white/45">
                        {group.heading}
                      </p>
                      <ul className="flex list-none flex-col gap-2">
                        {group.links.map((link) => (
                          <li key={link}>
                            <Link
                              href="#"
                              // block so the line-height applies to the row —
                              // an inline <a> leaves the <li> on its own strut
                              className="block font-noi-grotesk text-[16px] leading-[1.4] tracking-[-0.015em] text-white transition-colors duration-150 hover:text-lime-30"
                            >
                              {link}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </StaggerItem>
              ))}
            </StaggerGroup>
          {/* <div className="mt-10 col-span-full mt-4 flex w-full items-center justify-between max-lg:flex-col max-lg:items-start max-lg:gap-6 lg:items-end xl:items-center">
            <DeltaLogo variant="white" className="h-10 w-[89px] shrink-0 object-contain" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {LEGAL.map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-white/70 transition-colors duration-150 hover:text-lime-30"
                >
                  {item}
                </Link>
              ))}
              <span className="font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em] text-white/50">
                ©{new Date().getFullYear()} Delta AI Academy. All rights reserved
              </span>
            </div>
          </div> */}
        </div>
      </div>

      {/* Oversized wordmark anchored to the bottom edge and clipped by the
          footer's rounded corners, matching the reference treatment. */}
      <div className=" w-full  flex h-fit overflow-hidden  justify-center items-center -mb-4 overflow-hidden md:-mb-6">
        <Reveal
          as="span"
          className="block text-nowrap -translate-x-[2%] font-sans-plomb text-[3.5rem] leading-none font-extrabold text-lime-30 italic [--translateY-from:100%] sm:text-[6rem] md:text-[9rem] xl:text-[16rem]"
        >
          <span aria-hidden>DELTA AI ACADEMY</span>
        </Reveal>
      </div>
    </footer>
  );
}
