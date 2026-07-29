import Image from "next/image";
import { ContactButton } from "./contact-dialog";
import { BrochureLink } from "./brochure-link";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { StaggerGroup, StaggerItem } from "./stagger";

/**
 * Real people, supplied by the academy — the stock portraits that used to sit
 * here are gone.
 *
 * The originals are 640px squares of full figures, and object-fit does no
 * cropping when the source and the frame share an aspect ratio, so the faces
 * came out tiny inside the circle. These are pre-cropped around each face
 * (see public/avatars) rather than fought with in CSS.
 */
const PEOPLE = [
  { name: "Jazeem", src: "/avatars/jazeem.jpg" },
  { name: "Riziwin", src: "/avatars/riziwin.jpg" },
  { name: "Sajjin", src: "/avatars/sajjin.jpg" },
  { name: "Abshar", src: "/avatars/abshar.jpg" },
  { name: "Nithin", src: "/avatars/nithin.jpg" },
  { name: "Thazim", src: "/avatars/thazim.jpg" },
];

export function ClosingCta() {
  return (
    <section className="relative flex w-full justify-center overflow-hidden  bg-[linear-gradient(to_bottom,#fff_20%,#e6fdff_100%)] ">
      <div className="relative flex w-full flex-col items-center px-6 py-14 text-center text-neutral-90 sm:px-10 sm:py-20">
        {/* Avatar group. Names are carried on alt/title only — the row reads as
            a face pile, not a credit line. */}
        <Reveal className="mb-8 [--translateY-from:20%]">
          <StaggerGroup className="flex -space-x-2 sm:-space-x-3" stagger={0.08}>
            {PEOPLE.map((person) => (
              <StaggerItem
                key={person.name}
                distance={18}
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-white sm:h-14 sm:w-14"
              >
                <Image
                  src={person.src}
                  alt={person.name}
                  title={person.name}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Reveal>

        {/* Every claim here is one the page has already made and backed up —
            the price, the four projects, the beginner starting point. */}
        <SplitReveal
          as="h2"
          delay={0.2}
          className="max-w-4xl font-noi-grotesk text-[30px] leading-[1.1] tracking-[-0.025em] text-neutral-90 [--translateY-from:20%] sm:text-[36px] md:text-6xl md:leading-[1.05]"
        >
          Start building.
          <br className="hidden sm:inline" />
          {" "}No coding experience needed.
        </SplitReveal>

        <SplitReveal
          as="p"
          delay={0.35}
          className="mt-5 max-w-xl font-noi-grotesk text-[16px] leading-[1.45] tracking-[-0.015em] text-balance1 text-neutral-50 sm:mt-6 sm:text-[18px] md:text-[20px]"
        >
          One&nbsp;plan&nbsp;at&nbsp;AED&nbsp;99 , four applications you deploy yourself, five
          skill areas and twelve AI tools.
        </SplitReveal>

        <Reveal delay={0.45} className="mt-8 w-full max-w-sm [--translateY-from:20%] sm:w-auto sm:max-w-none">
          <div className="flex flex-col gap-3 sm:flex-row">
            <ContactButton
              source="closing-cta"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-neutral-90 px-8 sm:w-auto text-[16px] leading-none font-medium tracking-[-0.015em] text-white transition duration-150 ease-in-out hover:scale-[1.02] hover:bg-neutral-100"
            >
              Join now
            </ContactButton>
            <BrochureLink className="inline-flex h-12 w-full items-center justify-center rounded-full border border-neutral-90 px-8 sm:w-auto text-[16px] leading-none font-medium tracking-[-0.015em] transition duration-150 ease-in-out hover:bg-neutral-90/8">
              Get the brochure
            </BrochureLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

