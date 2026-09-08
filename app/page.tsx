import { Hero } from "@/components/hero";
import { AiTools } from "@/components/ai-tools";
import { ProjectsSection } from "@/components/projects-section";
import { WhyDelta } from "@/components/why-delta";
import { CertificateSection } from "@/components/certificate-section";
import { MentorsSection } from "@/components/mentors-section";
import { VibeCoding } from "@/components/vibe-coding";
import { CurriculumPreview } from "@/components/curriculum-preview";
import { Testimonials } from "@/components/testimonials";
import { PricingSection } from "@/components/pricing-section";
import { FaqSection } from "@/components/faq-section";
import { ClosingCta } from "@/components/closing-cta";
import { Preloader } from "@/components/preloader";

export default function Home() {
  return (
    <>
      {/* Homepage-only: the entrance curtain shouldn't replay on every route,
          just the first paint of the marketing page itself. */}
      <Preloader />
      <main className="page-surface overflow-x-clip">
        <Hero />
        <AiTools />
        <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 lg:px-36">
          <VibeCoding />
          <CurriculumPreview />
        </div>
        <div className="pb-8">
          <ProjectsSection />
        </div>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 py-8 lg:px-36 lg:py-12">
          <WhyDelta />
          <MentorsSection />
          <CertificateSection />
          <PricingSection />
          <Testimonials />
          <FaqSection />
        </div>
      </main>
      <ClosingCta />
    </>
  );
}
