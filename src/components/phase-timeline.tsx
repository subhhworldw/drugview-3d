import { useMemo } from "react";
import type { Drug } from "@/lib/drugs-data";
import { buildPhases, totalDuration } from "@/lib/animation-phases";

interface Props {
  drug: Drug;
  time: number;
  playing: boolean;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
}

export function PhaseTimeline({ drug, time, playing, onTogglePlay, onSeek }: Props) {
  const phases = useMemo(() => buildPhases(drug), [drug]);
  const duration = totalDuration(phases);

  let acc = 0;
  const phaseStarts = phases.map((p) => {
    const start = acc;
    acc += p.duration;
    return start;
  });

  const currentIdx = phases.findIndex(
    (_, i) => time >= phaseStarts[i] && time < phaseStarts[i] + phases[i].duration,
  );
  const idx = currentIdx === -1 ? phases.length - 1 : currentIdx;
  const current = phases[idx];

  return (
    <div className="border-t border-border bg-card/60 backdrop-blur">
      <div className="px-6 py-4">
        {/* Controls row */}
        <div className="mb-3 flex items-center gap-4">
          <button
            onClick={onTogglePlay}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:brightness-110"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="1" width="3" height="12" rx="0.5" />
                <rect x="9" y="1" width="3" height="12" rx="0.5" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M2 1 L13 7 L2 13 Z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => onSeek(0)}
            className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Restart
          </button>
          <div className="flex-1" />
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="text-primary">{current.label}</span>
            <span className="mx-3 text-border">|</span>
            <span>
              t = {time.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Phase strip */}
        <div className="flex gap-1">
          {phases.map((p, i) => {
            const isActive = i === idx;
            const isPast = i < idx;
            const localProgress = isActive
              ? (time - phaseStarts[i]) / p.duration
              : isPast
                ? 1
                : 0;
            return (
              <button
                key={p.id}
                onClick={() => onSeek(phaseStarts[i])}
                className="group relative flex-1 overflow-hidden rounded-sm bg-muted/60 text-left transition hover:bg-muted"
                style={{ flexGrow: p.duration }}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-primary/80 transition-all"
                  style={{ width: `${localProgress * 100}%` }}
                />
                <div className="relative px-2 py-2">
                  <div
                    className={`font-mono text-[10px] uppercase tracking-widest ${
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{current.description}</p>
      </div>
    </div>
  );
}
