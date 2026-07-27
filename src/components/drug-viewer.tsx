import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Maximize2, Minimize2 } from "lucide-react";
import type { Drug } from "@/lib/drugs-data";
import { BodySceneClient } from "@/components/body-scene";
import { DrugInfoPanel } from "@/components/drug-info-panel";
import { PhaseTimeline } from "@/components/phase-timeline";
import { ThemeToggle } from "@/components/theme-toggle";

export function DrugViewer({ drug, notice }: { drug: Drug; notice?: string }) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === sceneRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await sceneRef.current?.requestFullscreen();
    } catch {
      // fullscreen may be blocked; ignore
    }
  };


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

      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <div className="relative flex min-h-[60vh] flex-1 flex-col lg:min-h-0">
          <div
            ref={sceneRef}
            className="relative min-h-0 flex-1"
            style={{ background: "var(--gradient-body)" }}
          >
            <BodySceneClient
              drug={drug}
              time={time}
              playing={playing}
              onTimeChange={setTime}
            />
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit full screen" : "View full screen"}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur transition hover:text-foreground"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            {isFullscreen && (
              <div className="absolute inset-x-0 bottom-0 z-10">
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
            )}
          </div>
          {!isFullscreen && (
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
          )}
        </div>


        <aside className="w-full border-t border-border bg-card/40 lg:h-full lg:w-[380px] lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
          <DrugInfoPanel drug={drug} />
        </aside>
      </div>

    </div>
  );
}
