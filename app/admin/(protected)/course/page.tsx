import { CourseEditor } from "@/components/admin/course-editor";
import { getAdminCourse, isCourseContentConfigured } from "@/lib/course-content";

/** The course changes as it is edited, so this can't be cached. */
export const dynamic = "force-dynamic";

export default async function AdminCoursePage() {
  if (!isCourseContentConfigured()) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        The course API isn&rsquo;t configured — set <code>ACADEMY_API_URL</code> and{" "}
        <code>ACADEMY_API_SECRET</code> to edit lessons here.
      </div>
    );
  }

  const course = await getAdminCourse();
  if (!course) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        Couldn&rsquo;t reach the course API. It may be down, or the secret may not match.
      </div>
    );
  }

  const episodes = course.modules.reduce((n, m) => n + m.episodes.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
          Course
        </h1>
        <p className="font-noi-grotesk text-[14px] text-neutral-50">
          {course.modules.length} modules · {episodes} episodes
        </p>
      </div>
      <CourseEditor course={course} />
    </div>
  );
}
