import { Suspense } from "react";
import { InviteScreen } from "@/components/InviteScreen";

async function Invite({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <InviteScreen code={code} />;
}

/** /invite/<code> — a friend's invite link (prd.md > Community). */
export default function InvitePage({ params }: PageProps<"/invite/[code]">) {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center font-display text-xl text-ink-soft">Opening invite…</main>}>
      <Invite params={params} />
    </Suspense>
  );
}
