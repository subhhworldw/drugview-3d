import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Drug } from "@/lib/drugs-data";
import { BodySceneClient } from "@/components/body-scene";
import { DrugInfoPanel } from "@/components/drug-info-panel";
import { PhaseTimeline } from "@/components/phase-timeline";
import { ThemeToggle } from "@/components/theme-toggle";

export function DrugViewer({ drug, notice }: { drug: Drug; notice?: string }) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <Link
          to="/"
          className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Drug-View library
        </Link>
        <div className="flex items-center gap-3">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {drug.name}
          </div>
          <ThemeToggle />
        </div>
      </header>

      {notice && (
        <div className="border-b border-border bg-muted/40 px-6 py-2 text-center text-[11px] text-muted-foreground">
          {notice}
        </div>
      )}

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="relative flex min-h-[60vh] flex-1 flex-col lg:min-h-0">
          <div className="flex-1" style={{ background: "var(--gradient-body)" }}>
            <BodySceneClient
              drug={drug}
              time={time}
              playing={playing}
              onTimeChange={setTime}
            />
          </div>
          <PhaseTimeline
            drug={drug}
            time={time}
            playing={playing}
            onTogglePlay={() => setPlaying((p) => !p)}
            onSeek={(t) => {
              setTime(t);
              setPlaying(false);
            }}
          />
        </div>

        <aside className="w-full border-t border-border bg-card/40 lg:w-[380px] lg:border-l lg:border-t-0">
          <DrugInfoPanel drug={drug} />
        </aside>
      </div>
    </div>
  );
}
