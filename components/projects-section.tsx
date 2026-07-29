import Link from "next/link";
import { Reveal } from "./reveal";
import { SplitReveal } from "./split-reveal";
import { StaggerGroup, StaggerItem } from "./stagger";
import { ProjectMedia } from "./project-media";

const PROJECTS = [
  {
    eyebrow: "Project 01",
    title: "AI Portfolio Website",
    body: "A portfolio site with a modern UI, built with AI assisted coding and shipped to a live URL.",
    features: ["React.js", "AI assisted workflow", "Vercel"],
    tasks: [
      "Design and build your own layout",
      "Add your projects and case studies",
      "Deploy it to a live URL you can share",
    ],
    media: "/projects/portfolio.mp4",
  },
  {
    eyebrow: "Project 02",
    title: "Ecommerce Application",
    body: "A full storefront — browse, add to cart, place an order — backed by a real database.",
    features: ["Listing & search", "Cart & orders", "MongoDB Atlas"],
    tasks: [
      "Build the product catalogue and search",
      "Implement the cart and checkout flow",
      "Wire orders through to the database",
    ],
    media: "/projects/ecommerce.mp4",
  },
  {
    eyebrow: "Project 03",
    title: "Social Media Application",
    body: "A social app with real accounts, a live feed, and everything running on your own backend.",
    features: ["Profiles & auth", "Posts, likes, comments", "Python FastAPI"],
    tasks: [
      "Build sign up, login and profiles",
      "Create the feed with posts and comments",
      "Add image upload and deploy the app",
    ],
    media: "/projects/social.webp",
  },
  {
    eyebrow: "Project 04",
    title: "Mobile Social App",
    body: "The same social product as a real mobile app — built with React Native and Expo, running on your own phone.",
    features: ["React Native", "Expo", "iOS & Android"],
    tasks: [
      "Set up the Expo project and navigation",
      "Build the feed and profile screens",
      "Run and test it on your own phone",
    ],
    media: "/projects/mobile.mp4",
  },
];

/** Clears the fixed nav (24px offset + 56px tall) with a little breathing room. */
const FIRST_CARD_TOP = 104;
/** Each card parks slightly lower, so the stack shows its edges. */
const STAGGER = 26;

export function ProjectsSection() {
  return (
    <div
      id="projects"
      className="mx-auto w-full max-w-[1440px] px-6 pt-12 pb-8 lg:px-36"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10 pb-20 text-left lg:text-center">
        <SplitReveal
          as="h2"
          className="font-noi-grotesk text-[40px] leading-[1.1] tracking-[-0.025em] [--translateY-from:20%] md:text-[44px] md:leading-[1] lg:[--translateY-from:40%] xl:text-[48px]"
        >
          During the program, you will build real applications
        </SplitReveal>
        <Reveal
          as="p"
          delay={0.2}
          className="font-noi-grotesk text-[20px] leading-[1.1] tracking-[-0.015em] [--translateY-from:20%] lg:[--translateY-from:40%]"
        >
          Four complete products, not exercises — web and mobile, each one
          deployed and yours to show.
        </Reveal>
      </div>

      {/* Sticky stack: each card parks under the nav at a slightly lower offset,
          so the next one slides up over the last while the earlier cards' top
          edges stay visible underneath. Cards are opaque, and DOM order alone
          gives the later ones the higher paint order. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {PROJECTS.map((project, i) => (
          <div
            key={project.eyebrow}
            className="sticky"
            style={{ top: `${FIRST_CARD_TOP + i * STAGGER}px`,  }}
          >
            <article style={{boxShadow:"0px 0px 8px 1px #0000000e"}} className="grid gap-10 rounded-3xl bg-neutral-10 p-8 text-neutral-90 md:p-10 lg:grid-cols-2 lg:items-center">
              <div className="flex flex-col items-start gap-5">
                <span className="font-noi-grotesk text-[18px] leading-[1.4] tracking-[-0.015em] text-neutral-50">
                  {project.eyebrow}
                </span>
                <SplitReveal
                  as="h3"
                  className="font-noi-grotesk text-[32px] leading-[1.1] font-medium tracking-[-0.025em] xl:text-[40px]"
                >
                  {project.title}
                </SplitReveal>
                <SplitReveal
                  as="p"
                  delay={0.1}
                  className="font-noi-grotesk text-[18px] leading-[1.4] tracking-[-0.015em] text-pretty"
                >
                  {project.body}
                </SplitReveal>

                <StaggerGroup
                  as="ul"
                  className="flex list-none flex-wrap gap-2"
                  stagger={0.05}
                >
                  {project.features.map((feature) => (
                    <StaggerItem
                      as="li"
                      key={feature}
                      distance={14}
                      className="rounded-full bg-white px-3 py-1.5 font-noi-grotesk text-[14px] leading-[1.4] tracking-[-0.015em]"
                    >
                      {feature}
                    </StaggerItem>
                  ))}
                </StaggerGroup>

                {/* The hand-in: what each student actually produces. */}
                <div className="flex w-full flex-col gap-3 border-t border-neutral-90/10 pt-5">
                  <p className="font-noi-grotesk text-[14px] leading-[1.4] font-medium tracking-[-0.015em] text-neutral-50">
                    Your tasks
                  </p>
                  <StaggerGroup
                    as="ol"
                    className="flex list-none flex-col gap-3"
                    stagger={0.08}
                  >
                    {project.tasks.map((task, index) => (
                      <StaggerItem
                        as="li"
                        key={task}
                        distance={16}
                        className="flex items-start gap-3"
                      >
                        <span className="mt-[2px] flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-90 text-[11px] leading-none font-medium text-white">
                          {index + 1}
                        </span>
                        <span className="font-noi-grotesk text-[16px] leading-[1.4] tracking-[-0.015em]">
                          {task}
                        </span>
                      </StaggerItem>
                    ))}
                  </StaggerGroup>
                </div>

                <Link
                  href="#"
                  className="mt-1 inline-flex h-12 items-center justify-center rounded-lg bg-neutral-90 px-5 text-[18px] leading-none font-medium text-white transition duration-150 ease-in-out hover:bg-neutral-70"
                >
                  See the brief
                </Link>
              </div>

              <div className="aspect-[4/3] max-md:hidden w-full overflow-hidden rounded-2xl bg-white">
                <ProjectMedia
                  src={project.media}
                  alt={`${project.title} preview`}
                />
              </div>
            </article>
          </div>
        ))}
      </div>
    </div>
  );
}
