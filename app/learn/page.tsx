import type { Metadata } from "next";
import { CourseView } from "@/components/learn/course-view";

export const metadata: Metadata = {
  title: "Your course",
  // Rendered client-side behind a session, so there is nothing here for a
  // crawler to index anyway.
  robots: { index: false, follow: false },
};

export default function LearnPage() {
  return <CourseView />;
}
