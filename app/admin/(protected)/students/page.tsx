import { getWatchReport } from "@/lib/watch-progress";
import { formatDuration } from "@/lib/watch-states";
import { StudentsTable } from "@/components/admin/students-table";

/** Watch progress moves while you are looking at it, and a delete has to be
 *  gone from the list the moment it lands. */
export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const report = await getWatchReport();

  if (report === null) {
    return (
      <div className="rounded-2xl bg-white p-6 font-noi-grotesk text-[15px] text-neutral-50">
        MongoDB isn&rsquo;t configured yet — set <code>MONGODB_URI</code> to see students here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-noi-grotesk text-[20px] font-medium tracking-[-0.015em] text-neutral-90">
            Students
          </h1>
          <p className="mt-0.5 font-noi-grotesk text-[13px] text-neutral-50">
            Who has watched what, and who hasn&rsquo;t started.
          </p>
        </div>
        <p className="font-noi-grotesk text-[13px] text-neutral-50">
          {report.course.episodes} classes · {formatDuration(report.course.durationSec)}
        </p>
      </div>
      <StudentsTable report={report} />
    </div>
  );
}
