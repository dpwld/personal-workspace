import { listItems } from "@/lib/store";
import TasksClient from "./tasks-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const items = await listItems("task");
  return <TasksClient items={items} />;
}
