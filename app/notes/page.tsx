import { listItems } from "@/lib/store";
import NotesClient from "./notes-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const items = await listItems("note");
  return <NotesClient items={items} />;
}
