import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";

export const runtime = "nodejs";

/**
 * Image uploads for the blog editor, written under public/uploads and served
 * from /uploads/<name> by the same static handler as everything else in
 * public/.
 *
 * The directory is deliberately not in git (see .gitignore): it holds content,
 * not source. That also means it lives on the server's own disk — fine for
 * `next start` on a VPS, which is how this deploys, but a host that rebuilds
 * onto fresh storage would lose it. Worth knowing before anyone moves the
 * deployment.
 */

const MAX_BYTES = 5 * 1024 * 1024;

// Allowlisted so the extension is ours to choose rather than the uploader's —
// a filename is attacker-controlled, and the served path must never inherit
// one. SVG is excluded on purpose: it is a document that can carry script.
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
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

  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Images only — JPEG, PNG, WebP, GIF or AVIF." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That image is over 5 MB." }, { status: 413 });
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  // Name comes from us, not the upload: no collisions, no path traversal, no
  // surprise extension.
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${name}` });
}
