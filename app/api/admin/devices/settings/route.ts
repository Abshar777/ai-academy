import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-auth";
import { getDeviceSettings, setDeviceSettings } from "@/lib/device-settings";
import { MAX_DEVICES, MIN_DEVICES } from "@/lib/device-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The device whitelist's settings: whether it is enforced, and how many
 * devices it allows.
 *
 * Writing here changes who can open paid content, on a course API that reads
 * the same document — so it is admin-only, and the values are clamped rather
 * than trusted. Turning the limit off never forgives a revoked device; that
 * stays an admin's decision (see academy-api/src/auth/devices.ts).
 */
export async function GET() {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  return NextResponse.json(await getDeviceSettings());
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequestAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    enabled?: unknown;
    maxApproved?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Expected JSON." }, { status: 400 });

  const patch: { enabled?: boolean; maxApproved?: number } = {};
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be true or false." }, { status: 400 });
    }
    patch.enabled = body.enabled;
  }
  if (body.maxApproved !== undefined) {
    const n = Number(body.maxApproved);
    if (!Number.isFinite(n) || n < MIN_DEVICES || n > MAX_DEVICES) {
      return NextResponse.json(
        { error: `maxApproved must be between ${MIN_DEVICES} and ${MAX_DEVICES}.` },
        { status: 400 },
      );
    }
    patch.maxApproved = n;
  }
  if (patch.enabled === undefined && patch.maxApproved === undefined) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const settings = await setDeviceSettings(patch);
  if (!settings) return NextResponse.json({ error: "MongoDB is not configured." }, { status: 503 });
  return NextResponse.json(settings);
}
