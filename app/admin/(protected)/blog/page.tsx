import { listPosts } from "@/lib/blog";
import { BlogManager } from "@/components/admin/blog-manager";

export default async function AdminBlogPage() {
  const posts = await listPosts();

  if (posts === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to write posts here.
      </div>
    );
  }

  // Dates and ObjectIds don't cross the server/client boundary — same
  // flattening the coupons page does.
  const plain = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    contentHtml: p.contentHtml,
    coverImage: p.coverImage ?? null,
    status: p.status,
    author: p.author ?? null,
    updatedAt: p.updatedAt.toISOString(),
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
  }));

  return <BlogManager initialPosts={plain} />;
}
