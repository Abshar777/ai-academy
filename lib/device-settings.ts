import { getDb } from "./mongodb";
import {
  DEFAULT_DEVICE_SETTINGS,
  MAX_DEVICES,
  MIN_DEVICES,
  type DeviceSettings,
} from "./device-limits";

/**
 * Whether the device whitelist is enforced, and how many devices it allows.
 *
 * Kept in the database rather than the environment so it can be changed from
 * the admin panel without a deploy. The course API reads the same document —
 * see academy-api/src/auth/device-settings.ts, which is where it is actually
 * enforced; this side writes it and guards the admin's own approve button.
 *
 * The shape, defaults and bounds live in device-limits.ts, which imports
 * nothing — so the admin panel can read them without this module's Mongo
 * driver following it into the browser.
 */

const COLLECTION = "settings";
const ID = "devices";


export async function getDeviceSettings(): Promise<DeviceSettings> {
  const db = await getDb();
  if (!db) return DEFAULT_DEVICE_SETTINGS;
  const row = await db.collection(COLLECTION).findOne({ _id: ID as never });
  return {
    enabled: typeof row?.enabled === "boolean" ? row.enabled : DEFAULT_DEVICE_SETTINGS.enabled,
    maxApproved:
      typeof row?.maxApproved === "number" && row.maxApproved >= MIN_DEVICES
        ? Math.floor(row.maxApproved)
        : DEFAULT_DEVICE_SETTINGS.maxApproved,
  };
}

export async function setDeviceSettings(patch: Partial<DeviceSettings>): Promise<DeviceSettings | null> {
  const db = await getDb();
  if (!db) return null;

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.enabled !== undefined) set.enabled = patch.enabled;
  if (patch.maxApproved !== undefined) {
    // Clamped, not trusted: a zero would lock every buyer out of a course they
    // have paid for, and there is no way back in from the buyer's side.
    set.maxApproved = Math.min(MAX_DEVICES, Math.max(MIN_DEVICES, Math.floor(patch.maxApproved)));
  }

  await db.collection(COLLECTION).updateOne({ _id: ID as never }, { $set: set }, { upsert: true });
  return getDeviceSettings();
}
