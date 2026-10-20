import { listItems } from "@/lib/store";
import DiaryClient from "./diary-client";

export const dynamic = "force-dynamic";

export default async function DiaryPage() {
  const entries = await listItems("diary");
  return <DiaryClient entries={entries} />;
}
