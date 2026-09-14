import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, readingMinutes } from "@/lib/blog";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.status !== "published") return { title: `Not found — ${SITE_NAME}` };

  return {
    title: `${post.title} — ${SITE_NAME}`,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  // A draft is a 404 to the public, not a 403: saying "this exists but you
  // can't see it" leaks the existence and URL of unpublished work.
  if (!post || post.status !== "published") notFound();

  return (
    <main className="page-surface">
      <article className="mx-auto w-full max-w-[720px] px-5 pt-16 pb-20 sm:px-6 sm:pt-20 md:pt-24">
        <Link href="/blog" className="font-noi-grotesk text-[14px] text-neutral-50 hover:underline">
          ← Blog
        </Link>

        <h1 className="mt-6 font-noi-grotesk text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] text-balance text-neutral-90 sm:text-[40px] md:text-[48px]">
          {post.title}
        </h1>

        <p className="mt-4 font-noi-grotesk text-[14px] text-neutral-50">
          {post.author ? `${post.author} · ` : ""}
          {post.publishedAt ? `${formatDate(post.publishedAt)} · ` : ""}
          {readingMinutes(post.contentHtml)} min read
        </p>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt="" className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
        )}

        {/* Sanitised in lib/blog.ts on the way into the database, against an
            allowlist — so what renders here is only ever the small set of tags
            the editor itself offers. */}
        <div
          className="prose-post mt-10"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        <div className="mt-14 rounded-2xl bg-neutral-10 p-6 sm:p-8">
          <p className="font-noi-grotesk text-[19px] leading-[1.25] font-medium tracking-[-0.02em] text-neutral-90">
            Want to build this yourself?
          </p>
          <p className="mt-2 font-noi-grotesk text-[15px] leading-[1.45] text-neutral-70">
            The programme takes you from nothing to shipped — even if you have never coded.
          </p>
          <Link
            href="/order"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-neutral-90 px-5 font-noi-grotesk text-[15px] font-medium text-white transition hover:opacity-90"
          >
            Join the programme
          </Link>
        </div>
      </article>
    </main>
  );
}
