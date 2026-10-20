import { listItems } from "@/lib/store";
import { COLLECTIONS } from "@/lib/collections";
import CollectionClient from "@/components/collection-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const items = await listItems("travel");
  return <CollectionClient config={COLLECTIONS.travel} items={items} />;
}
