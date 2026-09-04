"use client";

import { useState } from "react";
import { SplitReveal } from "./split-reveal";
import { StaggerGroup, StaggerItem } from "./stagger";
import { usePlanLabel, withPlanPrice } from "@/lib/use-plan-price";

/**
 * Answers are drawn from the brochure's own claims — the stack, the projects,
 * the tools and the deployment targets. Worth a read-through against the real
 * curriculum before this goes live.
 */
const FAQS = [
  {
    q: "Do I need any coding experience to join?",
    a: "No. The programme is built for beginners and assumes no prior AI or development experience. You start with AI assisted tools from day one and learn the underlying concepts as you build.",
  },
  {
    q: "What will I build during the programme?",
    a: "Four complete applications: an AI portfolio website, an ecommerce storefront, a social media web app, and the same social product as a mobile app in React Native with Expo. Every one is deployed and yours to keep.",
  },
  {
    q: "Which technologies will I learn?",
    a: "React.js for the web, React Native with Expo for mobile, Python FastAPI for backend APIs, and MongoDB Atlas for data. You will also learn version control with GitHub.",
  },
  {
    q: "Which AI tools will I work with?",
    a: "Lovable, ChatGPT Codex, Claude and Google AI Studio for building, alongside AI research and summarization tools, speech to text workflows such as Whisper, and automation tools that speed up development tasks.",
  },
  {
    q: "Will my applications actually go live?",
    a: "Yes. You deploy to production using Vercel, Hostinger VPS and Cloudflare, so each project ends up at a real URL you can share with employers or clients.",
  },
  {
    q: "What will I have at the end?",
    a: "A portfolio of real web and mobile applications, a working understanding of AI powered development, production deployment experience, and the confidence to build your own ideas.",
  },
  {
    q: "What language are classes conducted in?",
    a: "Classes are conducted in English, with live support also available in Malayalam if you'd prefer it.",
  },
  {
    q: "How can I pay?",
    a: "Pay in full, or split the {price} into instalments through Tabby or Tamara at enrolment. Razorpay is also accepted.",
  },
];

function Toggle({ open }: { open: boolean }) {
  return (
    <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current p-1">
      <svg viewBox="0 0 16 16" className="size-full" aria-hidden>
        <line
          x1="3"
          y1="8"
          x2="13"
          y2="8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="8"
          y1="3"
          x2="8"
          y2="13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={
            "origin-center transition-transform duration-300 " +
            (open ? "scale-y-0" : "scale-y-100")
          }
        />
      </svg>
    </div>
  );
}

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  const planLabel = usePlanLabel();

  return (
    <section
      id="faq"
      className="mx-auto grid max-w-5xl grid-cols-12 py-16 lg:py-24"
    >
      <div className="col-span-12 py-6 lg:col-span-3 lg:col-start-2 lg:py-0">
        <SplitReveal
          as="h2"
          className="font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] md:text-[44px] md:leading-[1] xl:text-[48px]"
        >
          FAQs
        </SplitReveal>
      </div>

      <div className="col-span-12 lg:col-span-7 lg:col-start-5">
        <StaggerGroup className="flex flex-col gap-y-6" stagger={0.07}>
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <StaggerItem
                key={item.q}
                distance={22}
                className="flex flex-col gap-y-6 border-b border-current/15 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                >
                  <div className="relative flex items-center justify-between gap-x-2 text-start">
                    <p className="font-noi-grotesk text-[18px] leading-[1.4] tracking-[-0.015em]">
                      {item.q}
                    </p>
                    <Toggle open={isOpen} />
                  </div>
                </button>

                {/* 0fr/1fr animates to the answer's natural height. */}
                <div
                  id={`faq-panel-${i}`}
                  className="grid transition-[grid-template-rows] duration-500 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="pb-6 font-noi-grotesk text-[16px] leading-[1.5] tracking-[-0.015em] opacity-70">
                      {withPlanPrice(item.a, planLabel)}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
