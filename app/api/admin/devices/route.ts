import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { listDevices } from "@/lib/devices";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const devices = await listDevices();
  if (devices === null) {
    return NextResponse.json({ error: "MongoDB is not configured." }, { status: 503 });
  }

  return NextResponse.json({ devices });
}
