import { CONTACT_CALL_URL, CONTACT_WHATSAPP_URL } from "@/lib/site";
import { CheckIcon } from "./check-icon";
import { PhoneIcon, WhatsAppIcon } from "./contact-icons";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { StaggerGroup, StaggerItem } from "./stagger";

/**
 * Who actually teaches the programme.
 *
 * `photo` points at public/mentors/. The initials sit underneath the photo
 * rather than beside it, so a missing or not-yet-added file degrades to a
 * monogram instead of a broken image.
 */

type Mentor = {
  name: string;
  /** Fallback shown until/unless the photo loads. */
  initials: string;
  role: string;
  bio: string;
  /** Optional credential chip under the bio. */
  badge: string | null;
};

const MENTORS: Mentor[] = [
  {
    name: "Abshar",
    initials: "A",
    role: "Academic Head",
    bio: "4+ years of experience in software development, with expertise in 45+ web and mobile applications, IT hosting, and AWS cloud technologies.",
    badge: "AWS Certified Developer",
  },
  {
    name: "Shan",
    initials: "S",
    role: "Chief Mentor",
    bio: "2+ years of experience in software development and AI technologies, specializing in AI tools, automation, and modern development workflows.",
    badge: null,
  },
];

/** Photo paths, kept next to the data they belong to. */
const PHOTOS: Record<string, string> = {
  Abshar: "/mentors/abshar.jpg",
  Shan: "/mentors/shan.jpg",
};

/** What both mentors do, regardless of speciality. */
const SUPPORT = [
  "Live weekly sessions, plus your questions answered between them",
  "Code and project reviews on what you actually build",
  "Support in English and Malayalam",
];

function MentorCard({ mentor }: { mentor: Mentor }) {
  const photo = PHOTOS[mentor.name];

  return (
    <StaggerItem
      distance={20}
      className="flex flex-col gap-5 rounded-3xl bg-neutral-10 p-6 transition-transform duration-200 ease-out hover:-translate-y-1 md:p-8"
    >
      <div className="flex items-center gap-4">
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-90 ring-4 ring-lime-30/25 sm:size-20">
          <span
            aria-hidden
            className="font-sans-plomb text-[20px] leading-none font-semibold tracking-[-0.015em] text-lime-30 sm:text-[24px]"
          >
            {mentor.initials}
          </span>
          {photo && (
            <span
              aria-hidden
              className="absolute inset-0 bg-cover bg-top"
              style={{ backgroundImage: `url(${photo})` }}
            />
          )}
        </span>

        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-noi-grotesk text-[22px] leading-[1.1] tracking-[-0.025em] md:text-[26px]">
            {mentor.name}
          </h3>
          <span className="font-noi-grotesk text-[14px] leading-[1.3] font-medium tracking-[-0.015em] text-neutral-50 md:text-[15px]">
            {mentor.role}
          </span>
        </div>
      </div>

      <p className="font-noi-grotesk text-[15px] leading-[1.5] tracking-[-0.015em] text-pretty text-neutral-50 md:text-[16px]">
        {mentor.bio}
      </p>

      {mentor.badge && (
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-lime-30/25 px-3.5 py-1.5 font-noi-grotesk text-[13px] leading-none font-medium tracking-[-0.01em] text-[#4f6a00]">
          <CheckIcon className="size-3 shrink-0" />
          {mentor.badge}
        </span>
      )}
    </StaggerItem>
  );
}

export function MentorsSection() {
  return (
    <section id="mentors" className="py-20 lg:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 pb-14 lg:items-center lg:pb-16">
        <Reveal
          as="span"
          className="inline-block rounded-full bg-neutral-10 px-5 py-3 text-[16px] leading-[1.5] [--translateY-from:20%]"
        >
          Mentors
        </Reveal>
        <SplitReveal
          as="h2"
          delay={0.15}
          className="max-w-3xl font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:text-center lg:[--translateY-from:40%] xl:text-[48px]"
        >
          You build it. Someone experienced is watching over your shoulder.
        </SplitReveal>
        <Reveal
          as="p"
          delay={0.25}
          className="max-w-xl font-noi-grotesk text-[18px] leading-[1.35] tracking-[-0.015em] text-pretty text-neutral-50 [--translateY-from:20%] lg:text-center"
        >
          You learn from people who ship production software for a living — not from a
          pre-recorded course that cannot answer you back.
        </Reveal>
      </div>

      <StaggerGroup
        className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2"
        stagger={0.1}
      >
        {MENTORS.map((mentor) => (
          <MentorCard key={mentor.name} mentor={mentor} />
        ))}
      </StaggerGroup>

      <Reveal
        delay={0.15}
        className="mx-auto mt-4 flex max-w-5xl flex-col gap-6 rounded-3xl bg-neutral-90 p-6 text-white [--translateY-from:15%] md:flex-row md:items-center md:justify-between md:p-8"
      >
        <StaggerGroup as="ul" className="flex list-none flex-col gap-3" stagger={0.07}>
          {SUPPORT.map((item) => (
            <StaggerItem as="li" key={item} distance={14} className="flex items-start gap-3">
              <CheckIcon className="size-3 shrink-0 translate-y-1.5" />
              <span className="font-noi-grotesk text-[15px] leading-[1.4] tracking-[-0.015em] text-white/85">
                {item}
              </span>
            </StaggerItem>
          ))}
        </StaggerGroup>

        {/* Straight to a real conversation rather than the enquiry modal —
            "talk to a mentor" should actually start one. */}
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <a
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-lime-30 px-7 font-noi-grotesk text-[15px] leading-none font-semibold text-neutral-90 transition duration-150 ease-in-out hover:bg-lime-40 active:scale-[0.98]"
          >
            <WhatsAppIcon />
            Talk to a mentor
          </a>
          <a
            href={CONTACT_CALL_URL}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-white/25 px-7 font-noi-grotesk text-[15px] leading-none font-semibold text-white transition duration-150 ease-in-out hover:bg-white/10 active:scale-[0.98]"
          >
            <PhoneIcon />
            Call now
          </a>
        </div>
      </Reveal>
    </section>
  );
}
