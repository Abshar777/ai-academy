import { Hero } from "@/components/hero";
import { AiTools } from "@/components/ai-tools";
import { LearnSection } from "@/components/learn-section";
import { ProjectsSection } from "@/components/projects-section";
import { WhyDelta } from "@/components/why-delta";
import { VibeCoding } from "@/components/vibe-coding";
import { Testimonials } from "@/components/testimonials";
import { PricingSection } from "@/components/pricing-section";
import { FaqSection } from "@/components/faq-section";
import { ClosingCta } from "@/components/closing-cta";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ContactProvider } from "@/components/contact-dialog";
import { Preloader } from "@/components/preloader";

export default function Home() {
  return (
    <ContactProvider>
      <Preloader />
      <SiteHeader />
      <main className="page-surface overflow-x-clip">
        <Hero />
        <AiTools />
         <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6  lg:px-36 ">
          
       
         <VibeCoding />
         </div>
        
        {/* <LearnSection /> */}
        <div className="pb-8">
          <ProjectsSection />
          
        </div>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 py-8 lg:px-36 lg:py-12">
            <WhyDelta />
          <PricingSection />
         
          <Testimonials />
          <FaqSection />
        </div>
      </main>
          <ClosingCta />
      <SiteFooter />
    </ContactProvider>
  );
}
