import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { deletePost, getPost, slugify, updatePost, type BlogPostStatus } from "@/lib/blog";

export const runtime = "nodejs";

const STATUSES: BlogPostStatus[] = ["draft", "published"];

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { slug } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.status !== undefined && !STATUSES.includes(body.status as BlogPostStatus)) {
    return NextResponse.json({ error: "Status must be draft or published." }, { status: 400 });
  }
  if (body.title !== undefined && !String(body.title).trim()) {
    return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
  }

  const patch = {
    ...(body.title !== undefined ? { title: String(body.title) } : {}),
    ...(body.excerpt !== undefined ? { excerpt: String(body.excerpt) } : {}),
    ...(body.contentHtml !== undefined ? { contentHtml: String(body.contentHtml) } : {}),
    ...(body.coverImage !== undefined ? { coverImage: String(body.coverImage) } : {}),
    ...(body.author !== undefined ? { author: String(body.author) } : {}),
    ...(body.slug !== undefined ? { slug: slugify(String(body.slug)) } : {}),
    ...(body.status !== undefined ? { status: body.status as BlogPostStatus } : {}),
  };

  const updated = await updatePost(slug, patch);
  if (updated === null) {
    return NextResponse.json({ error: "Post not found, or MongoDB is not configured." }, { status: 404 });
  }
  if (updated === "duplicate") {
    return NextResponse.json({ error: "Another post already uses that URL." }, { status: 409 });
  }
  return NextResponse.json({ post: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { slug } = await params;
  const deleted = await deletePost(slug);
  if (deleted === null) {
    return NextResponse.json({ error: "MongoDB is not configured." }, { status: 503 });
  }
  if (!deleted) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
