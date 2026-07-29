import { ContactButton } from "./contact-dialog";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { StaggerGroup, StaggerItem } from "./stagger";

export function ClosingCta() {
  const avatars = [
    {
      src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80",
      alt: "Academy student",
    },
    {
      src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
      alt: "Academy student",
    },
    {
      src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
      alt: "Academy student",
    },
    {
      src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
      alt: "Academy student",
    },
    {
      src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80",
      alt: "Academy student",
    },
  ];

  return (
    <section className="relative flex w-full justify-center overflow-hidden  bg-[linear-gradient(to_bottom,#fff_20%,#e6fdff_100%)] ">
      <div className="relative flex flex-col items-center px-10 py-20 text-center text-neutral-90">
        {/* Avatar Group */}
        <Reveal className="[--translateY-from:20%] mb-8">
          <StaggerGroup className="flex -space-x-3" stagger={0.08}>
            {avatars.map((avatar, idx) => (
              <StaggerItem
                key={idx}
                distance={18}
                className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-white"
              >
                <img
                  src={avatar.src}
                  alt={avatar.alt}
                  className="h-full w-full object-cover"
                />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Reveal>

        {/* Heading */}
        <SplitReveal
          as="h2"
          delay={0.2}
          className="font-noi-grotesk text-[36px]   text-neutral-90 [--translateY-from:20%] md:text-6xl max-w-4xl"
        >
          Where AI labs and experts
          <br className="hidden sm:inline" />
          {" "}connect to shape better models
        </SplitReveal>

        {/* Button */}
        <Reveal
          delay={0.3}
          className="mt-8 [--translateY-from:20%]"
        >
          <ContactButton
            source="closing-cta"
            className="inline-flex h-12 items-center justify-center rounded-full bg-neutral-90 px-8 text-[16px] leading-none font-medium tracking-[-0.015em] text-white transition duration-150 ease-in-out hover:bg-neutral-100 hover:scale-[1.02]"
          >
            Sign up now
          </ContactButton>
        </Reveal>
      </div>
    </section>
  );
}

