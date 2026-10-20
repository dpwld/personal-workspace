import { listItems } from "@/lib/store";
import StudyClient from "./study-client";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const [courses, assignments, lectures] = await Promise.all([
    listItems("course"),
    listItems("assignment"),
    listItems("lecture"),
  ]);
  return <StudyClient courses={courses} assignments={assignments} lectures={lectures} />;
}
