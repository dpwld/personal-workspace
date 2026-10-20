import { listItems } from "@/lib/store";
import ReadingClient from "./reading-client";

export const dynamic = "force-dynamic";

export default async function ReadingPage() {
  const [books, notes] = await Promise.all([listItems("book"), listItems("book_note")]);
  return <ReadingClient books={books} notes={notes} />;
}
