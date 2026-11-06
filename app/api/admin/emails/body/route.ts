import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { getEmailLogEntry } from "@/lib/email-log";

export const runtime = "nodejs";

/**
 * The stored body of one logged email, for the preview frame.
 *
 * Served as its own document rather than injected into the admin page, so it
 * renders inside a sandboxed iframe with its own origin rules. These bodies
 * come from our own templates, but they interpolate names and addresses that
 * people typed, and a preview that pasted them into the admin's DOM would run
 * anything that ever got through that. The sandbox attribute plus the CSP
 * below mean the frame can paint and nothing else: no scripts, no network,
 * no form posts.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const entry = await getEmailLogEntry(id);
  if (!entry) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (!entry.bodyHtml) {
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:24px;font:15px/1.5 -apple-system,system-ui,sans-serif;color:#8a8a8a;">No body was kept for this one.</body>`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }

  return new NextResponse(entry.bodyHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // Images are allowed because the templates use them for the brand mark;
      // everything else that could reach out or execute is not.
      "Content-Security-Policy":
        "default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; font-src data:; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
