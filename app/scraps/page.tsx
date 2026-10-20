import { listItems } from "@/lib/store";
import ScrapsClient from "./scraps-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const items = await listItems("scrap");
  return <ScrapsClient items={items} />;
}
