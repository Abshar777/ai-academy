import { CURRICULUM, CURRICULUM_TOPIC_COUNT } from "./curriculum";

/**
 * Preset Q&A for the chat widget — no model call, no API key, no rate limit.
 * Every answer here is either FAQ copy already on the page or a direct
 * summary of a real /course module, so the bot can never say something the
 * site itself doesn't back up.
 *
 * This is a real tradeoff, not a free upgrade: it can only answer what's
 * listed below. A visitor asking something adjacent-but-different gets
 * matched to the closest entry by keyword overlap, and anything with no
 * decent match gets the fallback rather than a guess.
 */

export type FaqEntry = {
  /** Shown as the question label and matched against directly. */
  question: string;
  /** Extra words worth matching on that don't appear in the question itself. */
  keywords: string[];
  answer: string;
};

export const FAQ_BOT_ENTRIES: FaqEntry[] = [
  {
    question: "Do I need any coding experience to join?",
    keywords: ["beginner", "experience", "coding", "prior", "background", "skill", "friendly"],
    // No leading "Yes"/"No" — this same answer surfaces under different
    // phrasings ("is it beginner friendly?"), and a canned yes/no only makes
    // sense for the one question it was written against.
    answer:
      "The programme is built for complete beginners and assumes no prior AI or development experience. You start with AI assisted tools from day one and learn the underlying concepts as you build.",
  },
  {
    question: "What will I build during the programme?",
    keywords: ["build", "project", "apps", "applications", "make"],
    answer:
      "Four complete applications: an AI portfolio website, an ecommerce storefront, a social media web app, and the same social product as a mobile app in React Native with Expo. Every one is deployed and yours to keep.",
  },
  {
    question: "Which technologies will I learn?",
    keywords: ["technology", "stack", "react", "python", "database", "mongodb", "learn"],
    answer:
      "React.js for the web, React Native with Expo for mobile, Python FastAPI for backend APIs, and MongoDB Atlas for data. You will also learn version control with GitHub.",
  },
  {
    question: "Which AI tools will I work with?",
    keywords: [
      "tool",
      "tools",
      "agent",
      "agents",
      "ai",
      "codex",
      "claude",
      "lovable",
      "kimi",
      "studio",
    ],
    answer:
      "Twelve tools in total. The core building agents are ChatGPT Codex, Claude Code, Lovable, Google AI Studio and Kimi — alongside research tools like Perplexity, automation with n8n, and others such as Cursor, GitHub Copilot, v0, Replit and Windsurf.",
  },
  {
    question: "How does the teaching actually work?",
    keywords: ["teach", "learn", "how", "vibe", "write", "typing", "syntax"],
    answer:
      "You don't write code by hand. You describe the app you want, an AI agent builds it, and you review, direct and refine the result. The skill you're building is judgement and direction, not memorising syntax.",
  },
  {
    question: "Will my applications actually go live?",
    keywords: ["live", "deploy", "deployment", "url", "vercel", "hosting", "cloudflare"],
    answer:
      "Every project is deployed to production using Vercel, Hostinger VPS and Cloudflare, so it ends up at a real URL you can share with employers or clients.",
  },
  {
    question: "What does it cost?",
    // "pay"/"payment" deliberately left off — those belong to the payment-
    // methods entry below, and this list already matches fine without them.
    keywords: ["price", "cost", "fee", "aed", "99", "money"],
    answer:
      "One plan, {price} total — every project, every tool, every skill area. No tiers, no subscriptions.",
  },
  {
    question: "What will I have at the end?",
    keywords: ["end", "finish", "after", "outcome", "result", "portfolio"],
    answer:
      "A portfolio of real web and mobile applications, a working understanding of AI powered development, production deployment experience, and the confidence to build your own ideas.",
  },
  {
    question: "How do I join?",
    keywords: ["join", "enrol", "enroll", "sign up", "start", "register"],
    answer:
      "Tap “Join now” anywhere on the page to get started, or “Get the brochure” if you'd rather read the details first.",
  },
  {
    question: "How is the course structured?",
    keywords: ["module", "modules", "structure", "curriculum", "syllabus", "outline", "many"],
    answer:
      `${CURRICULUM.length} modules, ${CURRICULUM_TOPIC_COUNT} topics: ${CURRICULUM.map((m) => m.title).join(", ")}. See the full breakdown, topic by topic, on the Curriculum page.`,
  },
  {
    question: "What does the AI fundamentals module cover?",
    keywords: [
      "fundamentals",
      "tokens",
      "hallucination",
      "context",
      "prompt",
      "engineering",
      "model",
      "models",
    ],
    answer:
      "Module 1 covers how AI actually works — what a model is, tokens and context windows, why AI hallucinates, traditional development versus AI-powered development, and prompt engineering fundamentals.",
  },
  {
    question: "What do I learn in the design module?",
    keywords: ["design", "figma", "stitch", "landing", "reference", "references"],
    answer:
      "Module 2 covers AI-assisted design — finding design references, designing with Figma Stitch, then actually building and hosting a landing page and a portfolio website with Git and Vercel.",
  },
  {
    question: "What's in the full-stack development module?",
    keywords: [
      "full-stack",
      "fullstack",
      "frontend",
      "backend",
      "database",
      "planning",
      "stacks",
      "custom",
    ],
    answer:
      "Module 3 covers full-stack web development — how frontend, backend and database fit together, comparing different tech stacks, planning a project properly, then building and hosting it with a custom domain.",
  },
  {
    question: "Does the course cover mobile app development?",
    keywords: ["mobile", "native", "architecture"],
    answer:
      "Module 4 covers application development fundamentals — website versus mobile, choosing the right technology stack, planning an application, and how backend architecture actually works.",
  },
  {
    question: "What language are classes conducted in?",
    keywords: ["language", "malayalam", "english", "speak", "spoken"],
    answer:
      "Classes are conducted in English, with live support also available in Malayalam if you'd prefer it.",
  },
  {
    question: "How can I pay?",
    keywords: ["pay", "payment", "installment", "instalment", "tabby", "tamara", "razorpay", "emi"],
    answer:
      "Pay in full, or split the {price} into instalments through Tabby or Tamara at enrolment. Razorpay is also accepted.",
  },
];

const STOPWORDS = new Set([
  "the","a","an","is","are","do","does","did","i","you","your","my","to","of",
  "in","on","for","and","or","what","which","how","will","can","need","it",
  "this","that","with","about","me","get","have","has",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

/** Matches free-typed input against the closest preset question, if any. */
export function matchFaq(input: string): FaqEntry | null {
  const inputTokens = new Set(tokens(input));
  if (inputTokens.size === 0) return null;

  let best: { entry: FaqEntry; score: number } | null = null;

  for (const entry of FAQ_BOT_ENTRIES) {
    const haystack = new Set([...tokens(entry.question), ...entry.keywords.map((k) => k.toLowerCase())]);
    let score = 0;
    for (const word of inputTokens) {
      // Weighted by word length rather than a flat +1: a generic short verb
      // ("teach", "pay") sits in several entries' keyword lists, while a rare,
      // specific word ("malayalam", "razorpay") only means one thing. Without
      // this, two entries tying on {one generic hit each} fall back to array
      // order and can surface the wrong answer — e.g. "do you teach in
      // malayalam" has "teach" (matches the generic teaching-method entry)
      // and "malayalam" (matches this one); flat scoring ties them 1-1 and
      // whichever entry happens to be earlier in the list wins regardless of
      // which word was the actual point of the question.
      if (haystack.has(word)) score += word.length;
      else {
        // Loose substring match catches simple plurals/typos ("app" vs
        // "apps") without pulling in a real fuzzy-matching dependency.
        for (const h of haystack) {
          if (h.length > 3 && (h.includes(word) || word.includes(h))) {
            score += word.length / 2;
            break;
          }
        }
      }
    }
    if (!best || score > best.score) best = { entry, score };
  }

  // Recalibrated for length-weighted scoring: a bare 2-letter exact hit
  // (score 2) is still coincidental, so the floor sits just above that — one
  // real 3+ letter word match, or a longer loose match, clears it.
  return best && best.score >= 3 ? best.entry : null;
}
