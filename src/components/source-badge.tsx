import type { DrugSource } from "@/lib/drugs-data";

export function SourceBadge({
  source,
  className = "",
}: {
  source: DrugSource;
  className?: string;
}) {
  const curated = source === "curated";
  return (
    <span
      title={
        curated
          ? "Hand-verified entry with full pharmacokinetic detail"
          : "Assembled automatically from RxNorm and openFDA label data"
      }
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
        curated
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-muted/40 text-muted-foreground"
      } ${className}`}
    >
      {curated ? "Curated" : "Auto · FDA data"}
    </span>
  );
}
