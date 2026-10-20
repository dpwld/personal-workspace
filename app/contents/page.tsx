import { listItems } from "@/lib/store";
import { COLLECTIONS } from "@/lib/collections";
import CollectionClient from "@/components/collection-client";
import Collapsible from "@/components/collapsible";

export const dynamic = "force-dynamic";

export default async function ContentsPage() {
  const [channels, ideas] = await Promise.all([listItems("channel"), listItems("idea")]);
  return (
    <div className="flex flex-col gap-8">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h1 className="page-title">콘텐츠</h1>
        <p className="page-desc">채널과 아이디어를 관리하고 업로드를 기록한다. 수익화 트랙의 작업대.</p>
      </div>
      <section>
        <h2 className="section-title">콘텐츠 아이디어</h2>
        <CollectionClient config={COLLECTIONS.idea} items={ideas} heading={false} />
      </section>
      <Collapsible title="채널" count={channels.length} defaultOpen={false}>
        <CollectionClient config={COLLECTIONS.channel} items={channels} heading={false} />
      </Collapsible>
    </div>
  );
}
