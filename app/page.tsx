import { Hero } from "@/components/hero";
import { AiTools } from "@/components/ai-tools";
import { HeroAd } from "@/components/hero-ad";
import { ProjectsSection } from "@/components/projects-section";
import { WhyDelta } from "@/components/why-delta";
import { CertificateSection } from "@/components/certificate-section";
import { MentorsSection } from "@/components/mentors-section";
import { VibeCoding } from "@/components/vibe-coding";
import { CurriculumPreview } from "@/components/curriculum-preview";
import { ReelsSection } from "@/components/reels-section";
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
        <HeroAd />
        <AiTools />
        {/* Third, before anything is asked for: the feed is what the academy
            looks like from outside, and it reads better as evidence than it
            does as an afterthought below the testimonials. Outside the padded
            wrapper below, because the card rail runs to both edges. */}
        <ReelsSection />
        
        <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 lg:px-36">
          <PricingSection />
           <CertificateSection />
          <VibeCoding />
          <CurriculumPreview />
        </div>
        <div className="pb-8">
          <ProjectsSection />
        </div>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 py-8 lg:px-36 lg:py-12">
          <WhyDelta />
          <MentorsSection />
         
          <Testimonials />
          <FaqSection />
        </div>
      </main>
      <ClosingCta />
    </>
  );
}
