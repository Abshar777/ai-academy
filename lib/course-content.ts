/**
 * The admin's window onto the course, which lives in academy-api rather than
 * here.
 *
 * Every call goes out server-side with ACADEMY_API_SECRET; the browser never
 * sees it, and the admin pages talk to our own /api/admin/course routes, which
 * check the admin session first and then forward. Two gates, and the content
 * API stays server-to-server exactly as the grant endpoint is.
 *
 * Longer timeout than lib/course-access.ts allows itself. That one runs while
 * a buyer waits on the thank-you page, so it gives up at five seconds; this
 * one runs while an admin waits, who would rather it finished.
 */

const TIMEOUT_MS = 15_000;

export type AdminMedia = {
  url: string;
  durationSec: number;
  streamUid: string | null;
};

export type AdminEpisode = {
  id: string;
  key: string;
  order: number;
  title: { en: string; ml?: string };
  isFree: boolean;
  media: Partial<Record<"en" | "ml", AdminMedia>>;
};

export type AdminModule = {
  id: string;
  order: number;
  title: { en: string; ml?: string };
  episodes: AdminEpisode[];
};

export type AdminCourse = {
  courseId: string;
  modules: AdminModule[];
};

export function isCourseContentConfigured(): boolean {
  return Boolean(process.env.ACADEMY_API_URL && process.env.ACADEMY_API_SECRET);
}

/**
 * Calls the content API. Returns the parsed body and the status together, so
 * a caller can pass the API's own error message through to the admin instead
 * of replacing it with something vaguer.
 */
export async function contentApi(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<{ status: number; data: unknown }> {
  const baseUrl = process.env.ACADEMY_API_URL;
  const secret = process.env.ACADEMY_API_SECRET;
  if (!baseUrl || !secret) {
    return { status: 503, data: { error: "ACADEMY_API_URL/SECRET are not set." } };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/internal${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": secret,
      },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (err) {
    console.error(`[course-content] ${path} failed`, err);
    return { status: 502, data: { error: "The course API did not answer." } };
  }
}

/** The whole course for the editor, or null when it can't be reached. */
export async function getAdminCourse(): Promise<AdminCourse | null> {
  const { status, data } = await contentApi("/content/course");
  if (status !== 200) return null;
  const course = data as AdminCourse;
  return Array.isArray(course?.modules) ? course : null;
}
