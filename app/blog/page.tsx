import type { Metadata } from "next";
import Link from "next/link";
import { listPosts, readingMinutes } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Delta AI Academy",
  description:
    "Notes on building with AI — what the tools can do, where they fall short, and how to ship real software with them.",
};

// Posts are written and published from the admin, so this must not be cached
// at build time: a post published at 3pm has to appear at 3pm.
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogIndexPage() {
  const posts = await listPosts({ status: "published" });

  return (
    <main className="page-surface">
      <div className="mx-auto w-full max-w-[1000px] px-5 pt-16 pb-20 sm:px-6 sm:pt-20 md:pt-24">
        <h1 className="font-sans-plomb text-[13vw] leading-[0.9] font-semibold tracking-[-0.02em] uppercase sm:text-[64px] md:text-[80px]">
          Blog
        </h1>
        <p className="mt-4 max-w-xl font-noi-grotesk text-[17px] leading-[1.4] text-neutral-70 sm:text-[19px]">
          Notes on building with AI — what the tools can do, where they fall
          short, and how to ship real software with them.
        </p>

        {/* Null means the database isn't reachable. The page still renders:
            the blog is not a reason for the site to fall over. */}
        {posts === null || posts.length === 0 ? (
          <p className="mt-12 font-noi-grotesk text-[16px] text-neutral-50">
            No posts yet — the first one is on its way.
          </p>
        ) : (
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col">
                {post.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImage}
                    alt=""
                    className="mb-4 aspect-[16/10] w-full rounded-2xl object-cover transition duration-200 group-hover:opacity-90"
                  />
                ) : (
                  <div className="mb-4 aspect-[16/10] w-full rounded-2xl bg-neutral-10" />
                )}
                <p className="font-noi-grotesk text-[13px] tracking-[-0.01em] text-neutral-50">
                  {post.publishedAt ? formatDate(post.publishedAt) : ""}
                  {post.publishedAt ? " · " : ""}
                  {readingMinutes(post.contentHtml)} min read
                </p>
                <h2 className="mt-2 font-noi-grotesk text-[22px] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-neutral-90 group-hover:underline sm:text-[24px]">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-2 font-noi-grotesk text-[15px] leading-[1.45] text-pretty text-neutral-70">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
