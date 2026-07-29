/**
 * Full module breakdown for the /course page.
 *
 * Source of truth: the internal curriculum build-tracker (module names and
 * topic order copied verbatim — this file only adds the `blurb` summaries,
 * which the tracker itself doesn't have since it's a personal checklist, not
 * student-facing copy).
 */

export type CurriculumTopic = {
  label: string;
};

export type CurriculumModule = {
  /** e.g. "Introduction to AI" — the "Module N ·" prefix is added at render time. */
  title: string;
  blurb: string;
  topics: CurriculumTopic[];
};

export const CURRICULUM: CurriculumModule[] = [
  {
    title: "Introduction to AI",
    blurb:
      "The concepts every later module assumes you already have — what a model actually is, why it sometimes gets things wrong, and how to talk to one.",
    topics: [
      { label: "What is AI? + How AI works" },
      { label: "What is an AI model? + the three types of AI models" },
      { label: "What are tokens? + context windows + AI hallucination" },
      { label: "Traditional development vs AI-powered development" },
      { label: "AI tools overview" },
      { label: "Six important things to know before you start" },
      { label: "Prompt engineering fundamentals" },
    ],
  },
  {
    title: "AI-Assisted Design",
    blurb:
      "From a blank page to a shipped landing page and portfolio site — finding references, generating designs, and getting a real project live.",
    topics: [
      { label: "Identifying typical AI design patterns" },
      { label: "How to find design references" },
      { label: "Creating designs using Figma Stitch" },
      { label: "Claude Code: explanation" },
      { label: "Building a landing page" },
      { label: "Building a portfolio website" },
      { label: "Git fundamentals & hosting with Vercel" },
    ],
  },
  {
    title: "Full-Stack Web Development",
    blurb:
      "What frontend, backend and database actually mean in practice, then planning and building a full product from scratch.",
    topics: [
      { label: "Frontend, backend & database explained" },
      { label: "Understanding different tech stacks" },
      { label: "Project planning phase" },
      { label: "Starting the development process" },
      { label: "Hosting frontend & backend" },
      { label: "Adding custom domains" },
    ],
  },
  {
    title: "Application Development Fundamentals",
    blurb:
      "Where mobile diverges from web — choosing a stack, planning an app, and understanding the backend architecture behind it.",
    topics: [
      { label: "Website vs mobile application" },
      { label: "Application development fundamentals" },
      { label: "Choosing the right technology stack" },
      { label: "Planning an application" },
      { label: "Starting the development process" },
      { label: "Backend architecture explained" },
    ],
  },
];

export const CURRICULUM_TOPIC_COUNT = CURRICULUM.reduce(
  (sum, mod) => sum + mod.topics.length,
  0,
);
