import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { approveDevice, revokeDevice } from "@/lib/devices";

export const runtime = "nodejs";

/** Approve or revoke one device. `id` is the device row's Mongo _id. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "revoke") {
    return NextResponse.json({ error: "`action` must be 'approve' or 'revoke'." }, { status: 400 });
  }

  if (body.action === "approve") {
    const result = await approveDevice(id);
    if (result.ok) return NextResponse.json({ ok: true });
    if (result.reason === "limit") {
      return NextResponse.json(
        { error: "This buyer already has two approved devices. Revoke one first." },
        { status: 409 },
      );
    }
    if (result.reason === "unavailable") {
      return NextResponse.json({ error: "MongoDB is not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Device not found." }, { status: 404 });
  }

  const result = await revokeDevice(id);
  if (result.ok) return NextResponse.json({ ok: true });
  if (result.reason === "unavailable") {
    return NextResponse.json({ error: "MongoDB is not configured." }, { status: 503 });
  }
  return NextResponse.json({ error: "Device not found." }, { status: 404 });
}
