import type { Drug } from "@/lib/drugs-data";
import { SourceBadge } from "@/components/source-badge";

interface Props {
  drug: Drug;
}

export function DrugInfoPanel({ drug }: Props) {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <header>
        <div className="flex items-center gap-2">
          <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
            {drug.drugClass}
          </div>
          <SourceBadge source={drug.source} />
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{drug.name}</h1>
        {drug.brand && (
          <div className="mt-1 text-sm text-muted-foreground">{drug.brand}</div>
        )}
        <p className="mt-3 text-sm text-muted-foreground">{drug.indication}</p>
      </header>

      <Section title="Mechanism of action">
        <p className="text-sm leading-relaxed text-foreground/90">{drug.mechanism}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {drug.receptors.map((r) => (
            <span
              key={r}
              className="rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent"
            >
              {r}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Pharmacokinetics">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs">
          <PKField label="Route" value={drug.route.toUpperCase()} />
          <PKField label="Onset" value={fmtMinutes(drug.onsetMinutes)} />
          <PKField label="Peak" value={fmtMinutes(drug.peakMinutes)} />
          <PKField
            label="t½"
            value={drug.halfLifeHours === null ? null : `${drug.halfLifeHours} h`}
          />
          <PKField
            label="Metabolism"
            value={
              drug.metabolism.enzymes.length
                ? drug.metabolism.enzymes.join(", ")
                : drug.metabolism.organ
                  ? `${drug.metabolism.organ} (enzymes not stated)`
                  : null
            }
          />
          <PKField label="Elimination" value={drug.elimination} />
        </dl>
      </Section>


      <Section title="Typical dose">
        <p className="font-mono text-sm text-foreground/90">{drug.typicalDose}</p>
      </Section>

      <Section title="Clinical notes">
        <ul className="space-y-2 text-sm text-foreground/90">
          {drug.clinicalNotes.map((n) => (
            <li key={n} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </Section>

      <footer className="mt-auto flex flex-col gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
        <span>Educational tool — not a prescribing reference. Verify against current label.</span>
        {drug.sourceUrl && (
          <a
            href={drug.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono uppercase tracking-widest text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            Reference ↗
          </a>
        )}
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PKField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}

function fmtMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${(m / 60).toFixed(m % 60 === 0 ? 0 : 1)} h`;
  return `${Math.round(m / 1440)} d`;
}
