import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { contentApi } from "@/lib/course-content";

export const runtime = "nodejs";

/** Rename a module. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const { status, data } = await contentApi(`/content/modules/${id}`, {
    method: "PATCH",
    body,
  });
  return NextResponse.json(data, { status });
}
