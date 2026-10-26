import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShareScreen } from "@/components/ShareScreen";

const KINDS = ["today", "milestone"] as const;
type Kind = (typeof KINDS)[number];

export function generateStaticParams() {
  return KINDS.map((kind) => ({ kind }));
}

async function ShareForKind({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!KINDS.includes(kind as Kind)) notFound();
  return <ShareScreen kind={kind as Kind} />;
}

/** /share/today and /share/milestone — spec.md > Share Cards */
export default function SharePage({ params }: PageProps<"/share/[kind]">) {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center font-display text-xl text-ink-soft">Drawing your card…</main>}>
      <ShareForKind params={params} />
    </Suspense>
  );
}
