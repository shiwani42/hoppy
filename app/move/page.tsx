import { Suspense } from "react";
import { MoveScreen } from "@/components/MoveScreen";
import { Loading } from "@/components/ui";

export default function MovePage() {
  return (
    <Suspense fallback={<Loading />}>
      <MoveScreen />
    </Suspense>
  );
}
