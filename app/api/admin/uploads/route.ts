import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";

export const runtime = "nodejs";

/**
 * Image uploads for the blog editor.
 *
 * These used to be written under public/uploads on the server's own disk, which
 * only ever worked in development: Next serves public/ from a manifest built at
 * build time, so a file written afterwards is not served, and on a host that
 * rebuilds onto fresh storage it would not survive either. Uploading appeared to
 * succeed and the image then never loaded.
 *
 * The file now goes to R2, the same bucket the course video lives in. The
 * credentials for it belong to the course API rather than this app, so the file
 * is forwarded there over the shared-secret channel already used for granting
 * course access — one copy of the secret, one service holding the keys.
 */

const MAX_BYTES = 5 * 1024 * 1024;

// Checked here as well as in the API: this is the boundary the browser reaches,
// and rejecting a 40 MB file before it crosses the network is worth doing.
// SVG is excluded on purpose — it is a document that can carry script.
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const baseUrl = process.env.ACADEMY_API_URL;
  const secret = process.env.ACADEMY_API_SECRET;
  if (!baseUrl || !secret) {
    return NextResponse.json(
      { error: "Image storage isn’t configured — ACADEMY_API_URL and ACADEMY_API_SECRET." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (!TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Images only — JPEG, PNG, WebP, GIF or AVIF." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That image is over 5 MB." }, { status: 413 });
  }

  const forwarded = new FormData();
  forwarded.append("file", file, file.name);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/internal/uploads`, {
      method: "POST",
      headers: { "X-Internal-Secret": secret },
      body: forwarded,
      // Generous next to the JSON calls: this is a file crossing the wire.
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!response.ok || !data?.url) {
      console.error(`[uploads] course API refused the image: ${response.status}`, data?.error ?? "");
      return NextResponse.json(
        { error: data?.error ?? "Could not store the image." },
        { status: response.status === 413 || response.status === 415 ? response.status : 502 },
      );
    }
    return NextResponse.json({ url: data.url });
  } catch (err) {
    console.error("[uploads] could not reach the course API", err);
    return NextResponse.json({ error: "Could not reach image storage." }, { status: 502 });
  }
}
