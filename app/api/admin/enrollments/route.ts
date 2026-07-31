import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { listEnrollments } from "@/lib/enrollments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(500, Number(url.searchParams.get("limit")) || 200);

  const enrollments = await listEnrollments({ limit });
  if (enrollments === null) {
    return NextResponse.json({ error: "MongoDB is not configured." }, { status: 503 });
  }

  return NextResponse.json({ enrollments });
}
