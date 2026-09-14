import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { createPost, listPosts, slugify, type BlogPostStatus } from "@/lib/blog";

export const runtime = "nodejs";

const STATUSES: BlogPostStatus[] = ["draft", "published"];

export async function GET() {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const posts = await listPosts();
  if (posts === null) {
    return NextResponse.json({ error: "MongoDB is not configured." }, { status: 503 });
  }
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
  const contentHtml = typeof body.contentHtml === "string" ? body.contentHtml : "";
  const coverImage = typeof body.coverImage === "string" ? body.coverImage : undefined;
  const author = typeof body.author === "string" ? body.author : undefined;
  const status = body.status as BlogPostStatus;
  const slug = typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(title);

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Status must be draft or published." }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json(
      { error: "That title has no letters or numbers to build a URL from — add a slug." },
      { status: 400 },
    );
  }
  // Only enforced on publish: a draft is somewhere to put an unfinished thought,
  // and demanding the whole post up front defeats the point of having drafts.
  if (status === "published" && !contentHtml.trim()) {
    return NextResponse.json({ error: "A published post needs some content." }, { status: 400 });
  }

  const created = await createPost({ title, slug, excerpt, contentHtml, coverImage, author, status });
  if (created === null) {
    return NextResponse.json({ error: "MongoDB is not configured." }, { status: 503 });
  }
  if (created === "duplicate") {
    return NextResponse.json({ error: `The URL "${slug}" is already taken.` }, { status: 409 });
  }
  return NextResponse.json({ post: created });
}
