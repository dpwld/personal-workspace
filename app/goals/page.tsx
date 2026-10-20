import { getGoals } from "@/lib/store";
import GoalsClient from "./goals-client";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = await getGoals();
  return <GoalsClient initial={goals} />;
}
