import Link from "next/link";
import { CONTACT_CALL_URL, CONTACT_PHONE_DISPLAY, CONTACT_WHATSAPP_URL } from "@/lib/site";
import { DeltaLogo, DeltaWordmark } from "./delta-logo";
import { BrochureLink } from "./brochure-link";
import { PhoneIcon, WhatsAppIcon } from "./contact-icons";
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
   
  ],
  [
     { heading: "Join", links: ["Enrol now", "Talk to our team"] },
  ]
];

const LEGAL = ["Privacy policy", "Accessibility", "Terms of service"];

/** Shared sizing for the two footer badges — same slot as store badges would
 *  occupy, minus the Apple/Google artwork and its trademarks. */
const BADGE_CLASS =
  "inline-flex h-[46px] w-full items-center justify-center rounded-lg border border-white/40 px-3 text-center text-[13px] leading-tight font-medium transition-colors duration-150 hover:border-white sm:w-[140px]";

export function SiteFooter() {
  return (
    <footer className="w-full overflow-hidden rounded-t-3xl bg-neutral-90 px-5 pt-8 text-white sm:px-6 md:p-6">
      <div className="mx-auto grid w-full grid-cols-4 gap-x-4 gap-y-2 pt-4 md:grid-cols-12 md:pt-8">
        <div className="col-span-full grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-8 lg:gap-10">
            <div className="flex flex-col gap-6 sm:gap-10">
              <SplitReveal
                as="h2"
                className="font-noi-grotesk text-[28px] leading-[1.1] tracking-[-0.025em] md:text-[40px] md:leading-[1] xl:text-[48px]"
              >
                Build AI powered
                <br />
                applications
              </SplitReveal>
              <StaggerGroup className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap" delay={0.15}>
                <StaggerItem distance={16}>
                  <BrochureLink className={BADGE_CLASS}>
                    Download brochure
                  </BrochureLink>
                </StaggerItem>
                <StaggerItem distance={16}>
                  <Link href="/order" className={BADGE_CLASS}>
                    Join the program
                  </Link>
                </StaggerItem>
              </StaggerGroup>
            </div>

            <div className="flex flex-col gap-3">
              <span className="font-noi-grotesk text-[12px] leading-none font-medium tracking-[0.12em] text-white/45 uppercase">
                Talk to us
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={CONTACT_CALL_URL}
                  className="inline-flex items-center gap-2 font-noi-grotesk text-[20px] leading-none font-semibold tracking-[-0.015em] transition-colors duration-150 hover:text-lime-30 md:text-[24px]"
                >
                  <PhoneIcon className="size-4 shrink-0" />
                  {CONTACT_PHONE_DISPLAY}
                </a>
                <a
                  href={CONTACT_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-lime-30 px-4 font-noi-grotesk text-[13px] leading-none font-semibold text-neutral-90 transition duration-150 ease-in-out hover:bg-lime-40"
                >
                  <WhatsAppIcon className="size-3.5" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
   <StaggerGroup className="grid w-full grid-cols-2 gap-x-4 gap-y-8 text-white sm:grid-cols-3 sm:gap-y-10 lg:max-w-[688px]" stagger={0.12}>
              {COLUMNS.map((column, i) => (
                // Three columns into a two-up grid leaves the last one alone on
                // its own row; below sm it spans the row and splits internally
                // so the space is used rather than left blank.
                <StaggerItem
                  key={i}
                  className={
                    "flex flex-col gap-8 sm:gap-10 " +""
                    // (i === COLUMNS.length - 1
                    //   ? "max-sm:col-span-2 max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-4"
                    //   : "")
                }
                >
                  {column.map((group) => (
                    <div key={group.heading} className="flex flex-col gap-3">
                      <p className="font-noi-grotesk text-[16px] leading-[1.4] tracking-[-0.015em] text-white/45">
                        {group.heading}
                      </p>
                      <ul className="flex list-none flex-col gap-2">
                        {group.links.map((link) => {
                          // block so the line-height applies to the row — an
                          // inline <a> leaves the <li> on its own strut
                          const linkClassName =
                            "block py-0.5 font-noi-grotesk text-[15px] leading-[1.5] tracking-[-0.015em] text-white transition-colors duration-150 hover:text-lime-30 sm:py-0 sm:text-[16px] sm:leading-[1.4]";
                          return (
                            <li key={link}>
                              {link === "Brochure" ? (
                                <BrochureLink className={linkClassName}>
                                  {link}
                                </BrochureLink>
                              ) : (
                                <Link href="#" className={linkClassName}>
                                  {link}
                                </Link>
                              )}
                            </li>
                          );
                        })}
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
