import { lazy, Suspense, useEffect, useState } from "react";
import type { Drug } from "@/lib/drugs-data";

const BodyScene = lazy(() =>
  import("./BodyScene").then((m) => ({ default: m.BodyScene })),
);

interface Props {
  drug: Drug;
  time: number;
  playing: boolean;
  onTimeChange: (t: number) => void;
}

export function BodySceneClient(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center bg-background/40">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Initializing visualization…
        </p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Loading 3D engine…
          </p>
        </div>
      }
    >
      <BodyScene {...props} />
    </Suspense>
  );
}
