import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";

/** Centred heading + supporting line that opens a content block. */
export function SectionIntro({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-6 text-left lg:mx-auto lg:text-center">
      <SplitReveal
        as="h2"
        className="font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] text-balance1 [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:[--translateY-from:40%] xl:text-[48px]"
      >
        {title}
      </SplitReveal>
      <Reveal
        as="p"
        delay={0.2}
        className="max-w-[546px] font-noi-grotesk text-[20px] leading-[1.1] tracking-[-0.015em] [--translateY-from:20%] lg:mx-auto lg:[--translateY-from:40%]"
      >
        {body}
      </Reveal>
    </div>
  );
}
