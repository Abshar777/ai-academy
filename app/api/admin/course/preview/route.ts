import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { contentApi } from "@/lib/course-content";

export const runtime = "nodejs";

/** Signs a video URL so the admin can play it. The bucket is private. */
export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { status, data } = await contentApi("/content/preview", { method: "POST", body });
  return NextResponse.json(data, { status });
}
