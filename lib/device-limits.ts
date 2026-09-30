/**
 * The device-limit vocabulary: the shape, the defaults, the range the panel
 * offers.
 *
 * Deliberately free of imports. Its twin, device-settings.ts, talks to Mongo,
 * and a client component importing a *value* from there — a bound, a default —
 * pulls the whole driver into the browser bundle and the build fails on
 * `child_process`. Types alone are fine, because they are erased; constants
 * are not. The same split as lib/lead-status.ts, for the same reason.
 */

export type DeviceSettings = { enabled: boolean; maxApproved: number };

/** Absent settings mean the original behaviour: enforced, two devices. A
 *  document nobody has written must not quietly unlock the course. */
export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = { enabled: true, maxApproved: 2 };

/** The range the panel offers. One is a real choice — a single seat per
 *  purchase — and above about ten the limit stops being a limit. */
export const MIN_DEVICES = 1;
export const MAX_DEVICES = 10;
