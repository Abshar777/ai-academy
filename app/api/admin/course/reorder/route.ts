import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { contentApi } from "@/lib/course-content";

export const runtime = "nodejs";

/** Reorder the modules themselves. */
export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { status, data } = await contentApi("/content/modules/reorder", {
    method: "POST",
    body,
  });
  return NextResponse.json(data, { status });
}
