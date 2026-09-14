"use client";

import { useCallback, useRef, useState } from "react";
import { BlogEditor } from "./blog-editor";

export type AdminPost = {
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImage: string | null;
  status: "draft" | "published";
  author: string | null;
  updatedAt: string;
  publishedAt: string | null;
};

type Draft = {
  original: string | null; // the slug this is editing, null for a new post
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  coverImage: string;
  author: string;
  status: "draft" | "published";
};

const EMPTY: Draft = {
  original: null, slug: "", title: "", excerpt: "",
  contentHtml: "", coverImage: "", author: "", status: "draft",
};

/** Mirrors slugify() in lib/blog.ts so the field previews the URL the server
 *  will actually store, rather than something close to it. */
function slugify(input: string): string {
  return input.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function BlogManager({ initialPosts }: { initialPosts: AdminPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Touched once by hand, the slug stops following the title — otherwise a
  // late title tweak would silently move a post somebody already linked to.
  const slugPinned = useRef(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const pendingUpload = useRef<((url: string | null) => void) | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/blog");
    const data = await res.json().catch(() => null);
    if (data?.posts) setPosts(data.posts);
  }

  /** Opens the file picker and resolves to the uploaded URL. Shared by the
   *  cover field and the editor's image button so there is one upload path. */
  const pickAndUpload = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      pendingUpload.current = resolve;
      fileInput.current?.click();
    });
  }, []);

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file twice still fires
    const resolve = pendingUpload.current;
    pendingUpload.current = null;
    if (!file) return resolve?.(null);

    setError("");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setError(data?.error ?? "Upload failed.");
        return resolve?.(null);
      }
      resolve?.(data.url);
    } catch {
      setError("Upload failed.");
      resolve?.(null);
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    slugPinned.current = false;
    setError(""); setNotice("");
    setDraft({ ...EMPTY });
  }

  function startEdit(post: AdminPost) {
    slugPinned.current = true;
    setError(""); setNotice("");
    setDraft({
      original: post.slug, slug: post.slug, title: post.title,
      excerpt: post.excerpt, contentHtml: post.contentHtml,
      coverImage: post.coverImage ?? "", author: post.author ?? "",
      status: post.status,
    });
  }

  async function save(status?: "draft" | "published") {
    if (!draft) return;
    const payload = { ...draft, status: status ?? draft.status };
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch(
        payload.original ? `/api/admin/blog/${payload.original}` : "/api/admin/blog",
        {
          method: payload.original ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title, slug: payload.slug || slugify(payload.title),
            excerpt: payload.excerpt, contentHtml: payload.contentHtml,
            coverImage: payload.coverImage, author: payload.author, status: payload.status,
          }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not save that.");
        return;
      }
      await refresh();
      setDraft(null);
      setNotice(payload.status === "published" ? "Published." : "Saved as a draft.");
    } catch {
      setError("Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(post: AdminPost) {
    setBusy(true); setError("");
    const next = post.status === "published" ? "draft" : "published";
    const res = await fetch(`/api/admin/blog/${post.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not change that.");
    } else {
      await refresh();
      setNotice(next === "published" ? "Published." : "Moved back to draft — it's off the public blog.");
    }
    setBusy(false);
  }

  async function remove(post: AdminPost) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/admin/blog/${post.slug}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not delete that.");
    } else {
      await refresh();
      setNotice("Deleted.");
    }
    setBusy(false);
  }

  const label = "block font-noi-grotesk text-[13px] font-medium text-neutral-70";
  const field =
    "mt-1.5 w-full rounded-lg border border-neutral-90/12 bg-white px-3 py-2 font-noi-grotesk text-[15px] text-neutral-90 outline-none focus:border-neutral-90/40";

  return (
    <div className="flex flex-col gap-5">
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleFileChosen} />

      <div className="flex items-center justify-between">
        <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
          Blog
        </h1>
        {!draft && (
          <button type="button" onClick={startNew}
            className="rounded-lg bg-neutral-90 px-4 py-2 font-noi-grotesk text-[14px] font-medium text-white transition hover:opacity-90">
            New post
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 font-noi-grotesk text-[14px] text-red-700">{error}</p>
      )}
      {notice && !error && (
        <p className="rounded-lg bg-lime-30/25 px-4 py-3 font-noi-grotesk text-[14px] text-neutral-90">{notice}</p>
      )}

      {draft ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="post-title">Title</label>
              <input id="post-title" className={field} value={draft.title}
                placeholder="How we teach AI development"
                onChange={(e) => {
                  const title = e.target.value;
                  setDraft((d) => d && {
                    ...d, title,
                    slug: slugPinned.current ? d.slug : slugify(title),
                  });
                }} />
            </div>
            <div>
              <label className={label} htmlFor="post-slug">URL</label>
              <input id="post-slug" className={field} value={draft.slug}
                placeholder="how-we-teach-ai-development"
                onChange={(e) => {
                  slugPinned.current = true;
                  setDraft((d) => d && { ...d, slug: e.target.value });
                }} />
              <p className="mt-1 font-noi-grotesk text-[12px] text-neutral-50">
                /blog/{draft.slug || "…"}
              </p>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="post-excerpt">Excerpt</label>
            <textarea id="post-excerpt" rows={2} className={field} value={draft.excerpt}
              placeholder="One or two lines — this is the card on /blog and the description search engines show."
              onChange={(e) => setDraft((d) => d && { ...d, excerpt: e.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Cover image</label>
              <div className="mt-1.5 flex items-center gap-3">
                <button type="button" disabled={busy}
                  onClick={async () => {
                    const url = await pickAndUpload();
                    if (url) setDraft((d) => d && { ...d, coverImage: url });
                  }}
                  className="rounded-lg border border-neutral-90/15 px-3 py-2 font-noi-grotesk text-[14px] text-neutral-70 transition hover:bg-neutral-90/5 disabled:opacity-50">
                  Choose file
                </button>
                {draft.coverImage && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft.coverImage} alt="" className="h-10 w-16 rounded object-cover" />
                    <button type="button" onClick={() => setDraft((d) => d && { ...d, coverImage: "" })}
                      className="font-noi-grotesk text-[13px] text-neutral-50 underline">
                      remove
                    </button>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className={label} htmlFor="post-author">Author</label>
              <input id="post-author" className={field} value={draft.author} placeholder="Optional"
                onChange={(e) => setDraft((d) => d && { ...d, author: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={label}>Content</label>
            <div className="mt-1.5">
              <BlogEditor
                value={draft.contentHtml}
                onChange={(html) => setDraft((d) => d && { ...d, contentHtml: html })}
                onUploadImage={pickAndUpload}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-neutral-90/8 pt-4">
            <button type="button" disabled={busy || !draft.title.trim()} onClick={() => save("published")}
              className="rounded-lg bg-neutral-90 px-4 py-2 font-noi-grotesk text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-40">
              {busy ? "Working…" : "Publish"}
            </button>
            <button type="button" disabled={busy || !draft.title.trim()} onClick={() => save("draft")}
              className="rounded-lg border border-neutral-90/15 px-4 py-2 font-noi-grotesk text-[14px] text-neutral-70 transition hover:bg-neutral-90/5 disabled:opacity-40">
              Save as draft
            </button>
            <button type="button" onClick={() => { setDraft(null); setError(""); }}
              className="font-noi-grotesk text-[14px] text-neutral-50 underline">
              Cancel
            </button>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
          No posts yet. &ldquo;New post&rdquo; starts one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white">
          {posts.map((post, i) => (
            <div key={post.slug}
              className={"flex flex-wrap items-center gap-3 px-5 py-4 " + (i > 0 ? "border-t border-neutral-90/8" : "")}>
              <span className={
                "shrink-0 rounded-full px-2.5 py-1 font-noi-grotesk text-[11px] font-bold tracking-[0.03em] " +
                (post.status === "published" ? "bg-lime-30 text-neutral-90" : "bg-neutral-90/10 text-neutral-70")
              }>
                {post.status === "published" ? "LIVE" : "DRAFT"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-noi-grotesk text-[15px] font-medium text-neutral-90">{post.title}</p>
                <p className="truncate font-noi-grotesk text-[12px] text-neutral-50">
                  /blog/{post.slug} · {post.publishedAt ? formatDate(post.publishedAt) : `edited ${formatDate(post.updatedAt)}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 font-noi-grotesk text-[13px]">
                {post.status === "published" && (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-neutral-50 underline">view</a>
                )}
                <button type="button" onClick={() => startEdit(post)} disabled={busy}
                  className="text-neutral-70 underline disabled:opacity-40">edit</button>
                <button type="button" onClick={() => toggleStatus(post)} disabled={busy}
                  className="text-neutral-70 underline disabled:opacity-40">
                  {post.status === "published" ? "unpublish" : "publish"}
                </button>
                <button type="button" onClick={() => remove(post)} disabled={busy}
                  className="text-red-600 underline disabled:opacity-40">delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
