import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { DeltaWordmark } from "@/components/delta-logo";
import { CONTACT_CALL_URL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY, SITE_NAME, SITE_URL } from "@/lib/site";
import { serif, SWITZER_CSS } from "./fonts";
import { LandingRuntime } from "./reveal";
import "./landing.css";

/* ─────────────────────────────────────────────────────────────────────────
   Ad landing page — /ai-development-course-for-beginners

   A separate page with a separate theme, after fixaplan.com: traffic arriving
   from an ad has one question, and this answers it without the marketing
   site's nav, banner, popups or chat bubble pulling at the edges. SiteChrome
   stays out (components/site-chrome.tsx) and the page brings its own floating
   nav and footer. Every visual decision lives in ./landing.css under `.lp`.

   Photography is the site's own: the mentor portrait and a project screenshot
   from public/. Nothing is taken from the reference site.
   ───────────────────────────────────────────────────────────────────────── */

const PATH = "/ai-development-course-for-beginners";
const URL = `${SITE_URL}${PATH}`;
const H1 = "AI Development Course for Beginners";
const DESCRIPTION =
  "Start learning AI development from scratch. Build real websites and apps with AI tools through practical projects, mentor support and beginner-friendly lessons.";

export const metadata: Metadata = {
  // `absolute`: the root layout's template would otherwise append the site
  // name a second time.
  title: { absolute: `${H1} | ${SITE_NAME}` },
  description: DESCRIPTION,
  keywords: [
    "AI development course for beginners",
    "AI course for beginners",
    "AI coding course for beginners",
    "AI development for beginners",
    "learn AI development for beginners",
    "AI programming course for beginners",
    "beginner AI development course",
    "learn software development with AI",
    "AI app development for beginners",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: `${H1} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: `${H1} | ${SITE_NAME}`, description: DESCRIPTION },
};

/* ── Content ────────────────────────────────────────────────────────────── */

const TRUST = [
  ["Beginner Friendly", "Yes"],
  ["Real Applications", "4"],
  ["AI Tools", "12+"],
  ["Live Mentor Support", "Weekly"],
] as const;

const DESCRIBE = [
  "What your application should do",
  "What screens it needs",
  "What information it should store",
  "How users should interact with it",
  "What features it should include",
];

const LEARN = [
  ["spark", "AI Fundamentals", "Understand what AI is, how AI models work and how AI is being used in software development."],
  ["palette", "AI-Assisted Design", "Learn how AI can help with application ideas, design references and interface development."],
  ["globe", "Web Development", "Learn the fundamentals of building modern web applications."],
  ["stack", "Full-Stack Development", "Understand how frontend, backend and database systems work together."],
  ["phone", "Mobile Development", "Explore mobile application development using React Native and Expo."],
  ["server", "Backend Development", "Work with Python and FastAPI."],
  ["database", "Databases", "Understand how applications work with data using MongoDB Atlas."],
  ["cloud", "Deployment", "Learn how applications can be deployed using platforms such as Vercel, Hostinger VPS and Cloudflare."],
] as const;

const BUILD = [
  ["user", "AI Portfolio Website", "Create and deploy a personal portfolio website."],
  ["cart", "Ecommerce Application", "Build a storefront with products, search, cart and orders."],
  ["heart", "Social Media Application", "Build an application with profiles, authentication, posts, likes and comments."],
  ["phone", "Mobile Social App", "Build a mobile version using React Native and Expo."],
] as const;

const TOOLS = [
  "Lovable",
  "ChatGPT Codex",
  "Claude",
  "Google AI Studio",
  "Cursor",
  "GitHub Copilot",
  "v0",
  "Replit",
  "Windsurf",
  "Perplexity",
  "n8n",
  "Hugging Face",
];

const SUPPORT = [
  ["video", "Live Weekly Sessions", "Learn directly and ask questions."],
  ["code", "Code Reviews", "Get feedback on your implementation."],
  ["eye", "Project Reviews", "Review what you're actually building."],
  ["chat", "Between-Session Questions", "Get support while working through the program."],
  ["language", "English + Malayalam Support", "Get support in both languages."],
] as const;

const AUDIENCE = [
  "Complete beginners",
  "Students",
  "Non-programmers",
  "Aspiring developers",
  "Entrepreneurs",
  "Creators",
  "Professionals exploring AI development",
];

const PATH_STEPS = [
  "Understand AI.",
  "Learn AI-assisted design.",
  "Start building web applications.",
  "Understand backend and databases.",
  "Explore mobile development.",
  "Deploy your applications.",
  "Review and improve your work.",
];

const OUTCOMES = [
  "AI-assisted development",
  "Full-stack development",
  "Mobile development",
  "Backend",
  "Database",
  "Deployment",
  "AI development tools",
];

const FAQ = [
  [
    "Can I learn AI development if I don't know coding?",
    "Yes. The program is designed for beginners and does not require prior AI or development experience.",
  ],
  [
    "Is this AI course suitable for complete beginners?",
    "Yes. The program starts with AI fundamentals and introduces development concepts while you build applications.",
  ],
  [
    "Do I need to know Python before joining?",
    "No prior Python experience is required. Python and FastAPI are introduced as part of the development stack.",
  ],
  ["Do I need to know React?", "No. React.js is part of the technologies covered in the program."],
  [
    "Will AI write all the code for me?",
    "AI tools are used to assist with development, but the program also focuses on understanding, directing, reviewing and improving what you're building.",
  ],
  [
    "Can I build an app without being a professional developer?",
    "AI-assisted development can make the development process more accessible, but building useful applications still requires learning the fundamentals, understanding the tools and reviewing the output.",
  ],
  [
    "What projects will I build as a beginner?",
    "You'll work on a portfolio website, ecommerce application, social media application and mobile social application.",
  ],
  [
    "Will I have someone to help me?",
    "Yes. The program includes live weekly sessions, questions support, code reviews and project reviews.",
  ],
  ["Is Malayalam support available?", "Yes. Support is available in English and Malayalam."],
  ["How much does the beginner course cost?", "The current launch price is ₹999."],
] as const;

/* ── Structured data ────────────────────────────────────────────────────── */

const ld = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(([question, answer]) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

const COURSE_LD = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: H1,
  description: DESCRIPTION,
  url: URL,
  provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  offers: { "@type": "Offer", price: "999", priceCurrency: "INR", url: `${SITE_URL}/order` },
};

/* ── Small pieces ───────────────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const order = (i: number) => ({ "--i": i }) as CSSProperties;

/* Line icons, drawn here rather than pulled from a set, so the page ships no
   icon library. 24-unit grid, 1.6 stroke. */
const ICONS: Record<string, ReactNode> = {
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5" />,
  palette: <path d="M12 21a9 9 0 1 1 8.6-11.7c.3 1.2-.6 2.2-1.8 2.2h-2.1a2 2 0 0 0-1.5 3.3c.7.8.5 2-.4 2.5A9 9 0 0 1 12 21ZM7.5 11.5h.01M10 7.5h.01M15 7.5h.01" />,
  globe: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9s-1.2 6.3-3.7 9c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3Z" />,
  stack: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />,
  phone: <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM10.5 18h3" />,
  server: <path d="M4 5h16a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM4 14h16a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1ZM7 7.5h.01M7 16.5h.01" />,
  database: <path d="M12 3c5 0 8 1.3 8 3s-3 3-8 3-8-1.3-8-3 3-3 8-3ZM4 6v12c0 1.7 3 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3 3 8 3s8-1.3 8-3" />,
  cloud: <path d="M7 18a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7ZM12 12v6M9.5 14.5 12 12l2.5 2.5" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />,
  cart: <path d="M3 4h2l2.4 11.2A2 2 0 0 0 9.4 17h8.2a2 2 0 0 0 2-1.6L21 8H6.2M9 21h.01M18 21h.01" />,
  heart: <path d="M12 20.5s-7.5-4.6-7.5-10A4 4 0 0 1 12 8a4 4 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10Z" />,
  video: <path d="M4 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM17 10l5-3v10l-5-3" />,
  code: <path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16" />,
  eye: <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  chat: <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8 10h8M8 13h5" />,
  language: <path d="M3 5h10M8 3v2c0 4-2.5 7.5-5 9M6 9c1 2.5 3 4.5 5 5.5M13 21l4-10 4 10M14.5 17h5" />,
};

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 7h11M7.5 1.5 13 7l-5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <span className="lp-chev" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="m2 4 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* Section opener: a small label chip over the headline, as on the reference. */
function Heading({ chip, children, className = "" }: { chip: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-start gap-5 ${className}`} data-reveal>
      <span className="lp-chip">{chip}</span>
      <h2 className="lp-h2 max-w-[24ch]">{children}</h2>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function BeginnersLandingPage() {
  return (
    <div className={`lp ${serif.variable}`}>
      <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={SWITZER_CSS} precedence="default" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(COURSE_LD) }} />
      <LandingRuntime />

      {/* Floating pill: wordmark and one action. No menu — an ad page has one job. */}
      <nav className="lp-nav" aria-label="Page">
        <Link href="/" aria-label={`${SITE_NAME} — home`} className="flex items-center">
          <DeltaWordmark className="h-[18px] w-[48px] object-contain" />
        </Link>
        <Link href="/order" className="lp-btn lp-btn-dark">
          Start learning
        </Link>
      </nav>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="lp-hero">
          <Image
            src="/mentors/shan.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="lp-hero-img"
          />
          <div className="lp-hero-inner">
            <p className="lp-eyebrow lp-load" style={order(0)}>
              No prior AI experience required
            </p>
            <h1 className="lp-h1 lp-load" style={order(1)}>
              AI Development Course <span className="lp-em">for Beginners</span>
            </h1>
            <p className="lp-lead lp-load" style={order(2)}>
              Learn how to build websites and applications with AI-assisted development — while
              understanding the technology behind what you&rsquo;re building.
            </p>
            <p className="lp-note lp-load" style={order(3)}>
              Delta AI Academy is designed for beginners who want to move from simply using AI tools to
              actually building with them.
            </p>
            <div className="lp-load mt-2 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row" style={order(4)}>
              <Link href="/order" className="lp-btn lp-btn-white w-full sm:w-auto">
                Start learning with AI <Arrow />
              </Link>
              <Link href="/watch" className="lp-btn lp-btn-glass w-full sm:w-auto">
                Join the free AI class
              </Link>
            </div>
          </div>
        </section>

        {/* ── Trust: photo card with glass chips ───────────────────────── */}
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="lp-photo" data-reveal>
              <Image src="/projects/social.webp" alt="A social media application built during the programme" fill sizes="(min-width: 1120px) 1072px, 100vw" />
              <div className="lp-photo-chips">
                {TRUST.map(([label, value]) => (
                  <div key={label} className="lp-glass">
                    <span>{label}</span>
                    <span className="lp-num">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Do you need to know coding? ──────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <Heading chip="01">Do You Need to Know Coding Before Learning AI Development?</Heading>
            <div className="lp-cards mt-8 lg:grid-cols-[1.1fr_1fr]">
              <div className="lp-card lp-card-white flex flex-col justify-between gap-10" data-reveal>
                <p className="lp-no">
                  <span className="lp-mark">No.</span>
                </p>
                <p className="lp-lead">
                  One of the biggest barriers for beginners is believing they need to become an experienced
                  programmer before they can start building.
                </p>
              </div>
              <div className="lp-cards">
                <div className="lp-card" data-reveal style={delay(80)}>
                  <p className="lp-body">
                    AI-assisted development gives beginners another way to approach software development.
                  </p>
                  <p className="lp-body mt-4">
                    You can describe what you want to build, work with AI tools to generate and modify code,
                    review the result, understand the concepts involved and gradually develop your technical
                    understanding.
                  </p>
                </div>
                <div className="lp-card lp-card-dark" data-reveal style={delay(160)}>
                  <p className="lp-h3 text-[clamp(1.25rem,2.2vw,1.6rem)] leading-[1.15]">
                    The goal isn&rsquo;t to skip learning.{" "}
                    <span className="lp-dim">The goal is to make the learning process more practical.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Start with an idea ───────────────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <Heading chip="02">
              Start With an <span className="lp-mark">Idea</span> — Not With Hundreds of Lines of Syntax
            </Heading>
            <div className="lp-cards mt-8 lg:grid-cols-[1fr_1.2fr]">
              <div className="lp-card flex flex-col gap-4" data-reveal>
                <p className="lp-lead">
                  Instead of beginning with endless syntax exercises, you&rsquo;ll learn through application
                  development.
                </p>
                <p className="lp-body">You can start by describing:</p>
                <p className="lp-body mt-auto">
                  Then you&rsquo;ll learn how AI-assisted development can help turn those requirements into
                  an application.
                </p>
              </div>
              <ol className="lp-card lp-card-white lp-rows" data-reveal style={delay(100)}>
                {DESCRIBE.map((item, i) => (
                  <li key={item} className="lp-row">
                    <span className="lp-num">{pad(i + 1)}</span>
                    <span className="lp-h3">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── What will beginners learn? ───────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <Heading chip="03">What Will Beginners Learn?</Heading>
            <div className="lp-cards lp-cards-4 mt-8">
              {LEARN.map(([icon, title, body], i) => (
                <div key={title} className="lp-card lp-card-hover" data-reveal style={delay((i % 4) * 60)}>
                  <div className="lp-icon">
                    <Icon name={icon} />
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── What can a beginner build? ───────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <Heading chip="04">
              What Can a Beginner Build?{" "}
              <span className="lp-dim">You&rsquo;ll work toward four real applications.</span>
            </Heading>
            <div className="lp-cards lp-cards-2 mt-8">
              {BUILD.map(([icon, title, body], i) => (
                <div key={title} className="lp-card lp-card-dark lp-card-hover" data-reveal style={delay((i % 2) * 80)}>
                  <div className="flex items-start justify-between">
                    <div className="lp-icon">
                      <Icon name={icon} />
                    </div>
                    <span className="lp-chip">{pad(i + 1)}</span>
                  </div>
                  <h3>{title}</h3>
                  <p className="lp-body">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AI tools ─────────────────────────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <div className="lp-card lp-card-dark" data-reveal>
              <span className="lp-chip">05</span>
              <h2 className="lp-h2 mt-5 max-w-[26ch]">
                AI Tools Beginners Can Learn.{" "}
                <span className="lp-dim">You don&rsquo;t need to master every tool at once.</span>
              </h2>
              <p className="lp-body mt-4">The program introduces:</p>
              <ul className="lp-cloud mt-5">
                {TOOLS.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
              <p className="lp-body mt-8 max-w-[52ch]">
                The objective is to understand where these tools can fit into an AI-assisted development
                workflow.
              </p>
            </div>
          </div>
        </section>

        {/* ── What if I get stuck? ─────────────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <Heading chip="06">What If I Get Stuck?</Heading>
            <div className="lp-cards lp-cards-3 mt-8">
              <div className="lp-card lp-card-white flex flex-col justify-end" data-reveal>
                <p className="lp-h3">You won&rsquo;t have to rely entirely on trial and error.</p>
                <p className="lp-body mt-2">The program includes:</p>
              </div>
              {SUPPORT.map(([icon, title, body], i) => (
                <div key={title} className="lp-card lp-card-hover" data-reveal style={delay((i % 3) * 70)}>
                  <div className="lp-icon">
                    <Icon name={icon} />
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who is this for? ─────────────────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <Heading chip="07">Who Is This Beginner AI Course For?</Heading>
            <div className="lp-cards mt-8 lg:grid-cols-[1.25fr_1fr]">
              <div className="lp-card" data-reveal>
                <p className="lp-body">This course is suitable for:</p>
                <ul className="lp-cloud mt-5">
                  {AUDIENCE.map((who) => (
                    <li key={who}>{who}</li>
                  ))}
                </ul>
              </div>
              <div className="lp-card lp-card-white flex flex-col" data-reveal style={delay(100)}>
                <span className="lp-chip self-start">Not sure if you&rsquo;re ready?</span>
                <p className="lp-h3 mt-6 text-[clamp(1.25rem,2.2vw,1.6rem)]">
                  You don&rsquo;t need to know everything before starting.
                </p>
                <p className="lp-body mt-2">You need the willingness to learn, follow the program and build.</p>
                <Link href="/course" className="lp-btn lp-btn-dark mt-8 self-start">
                  See the beginner-friendly curriculum <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Learning path ────────────────────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <Heading chip="08">Your Beginner Learning Path</Heading>
            <ol className="lp-card lp-card-white lp-rows mt-8" data-reveal>
              {PATH_STEPS.map((step, i) => (
                <li key={step} className="lp-row">
                  <span className="lp-num">Step {i + 1}</span>
                  <span className="lp-h3">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── What you'll have after ───────────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <div className="lp-card lp-card-dark" data-reveal>
              <span className="lp-chip">09</span>
              <h2 className="lp-h2 mt-5 max-w-[24ch]">
                What You&rsquo;ll Have After the Program.{" "}
                <span className="lp-dim">You&rsquo;ll have practical experience across:</span>
              </h2>
              <ul className="lp-cloud mt-8">
                {OUTCOMES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="lp-lead mt-8 max-w-[40ch]">
                You&rsquo;ll also have four applications that you worked on and deployed.
              </p>
            </div>
          </div>
        </section>

        {/* ── Offer ────────────────────────────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <div className="lp-offer" data-reveal>
              <span className="lp-chip !bg-white/15 !text-white/80">10</span>
              <h2 className="lp-h2 mt-5 !text-white max-w-[16ch]">Start Your AI Development Journey</h2>
              <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-3">
                <p className="lp-price">₹999</p>
                <p className="lp-was">₹4,000</p>
                <span className="lp-off">75% off</span>
              </div>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/order" className="lp-btn lp-btn-white">
                  Start learning for ₹999 <Arrow />
                </Link>
                <Link href="/watch" className="lp-btn lp-btn-glass">
                  Watch free AI class
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="lp-section pt-0">
          <div className="lp-wrap">
            <Heading chip="FAQ">Frequently Asked Questions</Heading>
            <div className="lp-faq mt-8 grid gap-2" data-reveal>
              {FAQ.map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    <span>{question}</span>
                    <Chevron />
                  </summary>
                  <p className="lp-answer">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="lp-section pt-4">
          <div className="lp-wrap flex flex-col items-center gap-8 text-center" data-reveal>
            <h2 className="lp-ghost max-w-[18ch]">
              You Don&rsquo;t Have to Be an <span className="lp-mark">Expert</span> to Start Building
            </h2>
            <p className="lp-lead max-w-[36ch]">
              Start learning AI-assisted development by building real applications.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/order" className="lp-btn lp-btn-dark">
                Start learning with AI <Arrow />
              </Link>
              <Link href="/watch" className="lp-btn lp-btn-outline">
                Join the free AI class
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="lp-wrap pb-3">
        <footer className="lp-footer">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col items-start gap-6">
              <Link href="/" aria-label={`${SITE_NAME} — home`}>
                <DeltaWordmark variant="white" className="h-5 w-[54px] object-contain" priority={false} />
              </Link>
              <Link href="/order" className="lp-btn lp-btn-white">
                Start learning
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-8 text-[14px] md:gap-14">
              <div className="flex flex-col gap-2">
                <p className="lp-dim">Programme</p>
                <Link href="/course">Curriculum</Link>
                <Link href="/watch">Free AI class</Link>
                <Link href="/order">Enrol</Link>
              </div>
              <div className="flex flex-col gap-2">
                <p className="lp-dim">Contact</p>
                <a href={CONTACT_CALL_URL}>{CONTACT_PHONE_DISPLAY}</a>
                <a href={`https://wa.me/${CONTACT_PHONE}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
                <Link href="/">deltaaiacademy.ai</Link>
              </div>
            </div>
          </div>
          <p className="lp-dim mt-10 text-[13px]">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
