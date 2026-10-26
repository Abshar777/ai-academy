import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { contentApi } from "@/lib/course-content";

export const runtime = "nodejs";

/** The course tree for the editor. */
export async function GET() {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { status, data } = await contentApi("/content/course");
  return NextResponse.json(data, { status });
}
