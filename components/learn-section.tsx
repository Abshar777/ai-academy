"use client";

import { useState } from "react";
import { SectionIntro } from "./section-intro";

const TOPICS = [
  {
    id: "fullstack",
    title: "Full stack",
    body: "Learn how to build modern web applications using React.js and AI assisted coding tools.",
    tag: "React.js",
  },
  {
    id: "mobile",
    title: "Mobile",
    body: "Create mobile applications using React Native and Expo so your apps run on real iOS and Android phones.",
    tag: "React Native · Expo",
  },
  {
    id: "backend",
    title: "Backend",
    body: "Build backend APIs using Python FastAPI to handle logins, bookings, and application logic.",
    tag: "Python FastAPI",
  },
  {
    id: "database",
    title: "Database",
    body: "Learn how to store and manage application data using MongoDB Atlas Cluster.",
    tag: "MongoDB Atlas",
  },
  {
    id: "deploy",
    title: "Deployment",
    body: "Deploy applications to production using Vercel, Hostinger VPS, and Cloudflare. You will also learn version control using GitHub.",
    tag: "Vercel · Cloudflare",
  },
];

const HEADING =
  "font-noi-grotesk text-[36px] leading-[1.1] tracking-[-0.025em] md:text-[40px]";
const BODY = "font-noi-grotesk text-[20px] leading-[1.1] tracking-[-0.015em]";

/**
 * Panels are drawn rather than photographed — the brochure is flattened
 * artwork with no isolated imagery to cut from. Swap these for real product
 * shots when there are some.
 */
function PanelStack({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl lg:col-span-5 lg:col-start-2">
      {TOPICS.map((topic, i) => (
        <div
          key={topic.id}
          aria-hidden
          className={
            "absolute inset-0 flex flex-col justify-end bg-[linear-gradient(150deg,#7af4ff_0%,#cdf3ff_38%,#f3f4fa_100%)] p-10 transition-opacity duration-500 " +
            (i === activeIndex ? "opacity-100" : "pointer-events-none opacity-0")
          }
        >
          <span className="font-sans-plomb text-[56px] leading-[0.9] font-semibold tracking-[-0.015em] uppercase">
            {topic.title}
          </span>
          <span className="mt-3 font-noi-grotesk text-[20px] leading-[1.1] tracking-[-0.015em] opacity-70">
            {topic.tag}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LearnSection() {
  const [active, setActive] = useState(0);

  return (
    <div
      id="learn"
      className="mx-auto w-full max-w-[1440px] px-6 pt-28 pb-8 lg:px-36"
    >
      <SectionIntro
        title="Your path to building with AI"
        body="At Delta AI Academy, we make AI development simple and accessible for beginners."
      />

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          {/* Desktop: panel beside an accordion. */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:items-center lg:gap-6">
            <PanelStack activeIndex={active} />

            <div className="flex flex-col gap-8 lg:col-span-5 lg:col-start-8">
              {TOPICS.map((topic, i) => {
                const open = i === active;
                return (
                  <div key={topic.id}>
                    <h3 className={HEADING}>
                      <button
                        type="button"
                        onClick={() => setActive(i)}
                        aria-expanded={open}
                        aria-controls={`${topic.id}-panel`}
                        className={
                          "text-left transition-opacity " +
                          (open ? "opacity-100" : "opacity-40 hover:opacity-70")
                        }
                      >
                        {topic.title}
                      </button>
                    </h3>
                    {/* 0fr/1fr rows animate to content height without a fixed
                        px value. The margin has to live on an inner wrapper —
                        on the <p> it escapes the collapsed row. */}
                    <div
                      id={`${topic.id}-panel`}
                      className="grid transition-[grid-template-rows] duration-500 ease-out"
                      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <p className={`${BODY} mt-4 max-w-md`}>{topic.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile: every topic stacked and expanded. */}
          <div className="flex flex-col gap-12 lg:hidden">
            {TOPICS.map((topic) => (
              <div key={topic.id} className="flex flex-col gap-4 pb-10">
                <div className="relative flex aspect-square w-full max-w-96 flex-col justify-end overflow-hidden rounded-3xl bg-[linear-gradient(150deg,#7af4ff_0%,#cdf3ff_38%,#f3f4fa_100%)] p-8">
                  <span className="font-sans-plomb text-[48px] leading-[0.9] font-semibold uppercase">
                    {topic.title}
                  </span>
                  <span className="mt-2 font-noi-grotesk text-[18px] opacity-70">
                    {topic.tag}
                  </span>
                </div>
                <h3 className={`${HEADING} pt-5 text-balance`}>{topic.title}</h3>
                <p className={`${BODY} text-balance`}>{topic.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
