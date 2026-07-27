import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchAllDrugs, filterDrugs, uniqueDrugClasses } from "@/lib/drugs-data";
import { lookupDrug } from "@/lib/drug-lookup.functions";
import { SourceBadge } from "@/components/source-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Drug-View — 3D drug pharmacology visualizer" },
      {
        name: "description",
        content:
          "Interactive 3D visualization of how common drugs move through the body: absorption, distribution, receptor binding, metabolism and elimination. For medical students and clinicians.",
      },
      { property: "og:title", content: "Drug-View — 3D drug pharmacology visualizer" },
      {
        property: "og:description",
        content:
          "Search a curated pharmacology library and watch each drug animate through the body in 3D.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Library,
});

function Library() {
  const [q, setQ] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const { data: drugs = [], isLoading, error } = useQuery({
    queryKey: ["drugs"],
    queryFn: fetchAllDrugs,
    staleTime: 5 * 60 * 1000,
  });

  const drugClasses = useMemo(() => uniqueDrugClasses(drugs), [drugs]);

  const results = useMemo(() => {
    let out = filterDrugs(drugs, q);
    if (selectedClass) out = out.filter((d) => d.drugClass === selectedClass);
    return out;
  }, [drugs, q, selectedClass]);

  // Live lookup: only when the local catalog has nothing, debounced so typing
  // doesn't spam RxNorm/openFDA. Each term is attempted at most once.
  const queryClient = useQueryClient();
  const runLookup = useServerFn(lookupDrug);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const attempted = useRef<Set<string>>(new Set());

  const shouldLookup =
    !isLoading && !error && !selectedClass && q.trim().length >= 3 && results.length === 0;

  useEffect(() => {
    if (!shouldLookup) {
      setLookupMessage(null);
      return;
    }
    const term = q.trim().toLowerCase();
    if (attempted.current.has(term)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      attempted.current.add(term);
      setLookingUp(true);
      setLookupMessage(null);
      try {
        const res = await runLookup({ data: { term } });
        if (cancelled) return;
        if (res.status === "ok") {
          await queryClient.invalidateQueries({ queryKey: ["drugs"] });
        } else {
          setLookupMessage(res.message ?? "No structured data available for this drug.");
        }
      } catch {
        if (!cancelled) setLookupMessage("Live lookup is unavailable right now.");
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shouldLookup, q, runLookup, queryClient]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M2 12h20" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div>
              <h1 className="font-mono text-sm uppercase tracking-widest">Drug-View</h1>
              <p className="text-[11px] text-muted-foreground">
                3D pharmacology visualizer
              </p>
            </div>
          </div>
          <div className="hidden font-mono text-[11px] uppercase tracking-widest text-muted-foreground md:block">
            {drugs.length} drugs · {drugClasses.length} classes
          </div>
        </div>
      </header>

      {/* Hero + search */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            See a drug move through the body.
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Pick any medication to watch its route of administration, distribution,
            target binding, metabolism and elimination animate in 3D — with the
            pharmacokinetic detail clinicians actually need.
          </p>

          <div className="mt-8 max-w-xl">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, brand, class or indication…"
                className="w-full rounded-md border border-input bg-input/40 py-3 pl-10 pr-3 text-sm outline-none ring-primary/40 transition focus:border-primary focus:ring-2"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={!selectedClass} onClick={() => setSelectedClass(null)}>
              All classes
            </FilterChip>
            {drugClasses.map((c) => (
              <FilterChip
                key={c}
                active={selectedClass === c}
                onClick={() => setSelectedClass(c === selectedClass ? null : c)}
              >
                {c}
              </FilterChip>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        {isLoading ? (
          <div className="py-24 text-center text-muted-foreground">Loading drug library…</div>
        ) : error ? (
          <div className="py-24 text-center text-destructive">
            Failed to load drug library.
          </div>
        ) : results.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            {lookingUp ? (
              <>
                <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
                  Searching FDA &amp; RxNorm…
                </div>
                <p className="mt-2 text-sm">
                  Not in the local catalog — looking &ldquo;{q}&rdquo; up live.
                </p>
              </>
            ) : lookupMessage ? (
              <p className="text-sm">{lookupMessage}</p>
            ) : (
              <>No drugs match &ldquo;{q}&rdquo;.</>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((d) => (
              <Link
                key={d.slug}
                to="/drug/$slug"
                params={{ slug: d.slug }}
                className="group rounded-lg border border-border bg-card p-4 transition hover:border-primary/60 hover:shadow-[var(--shadow-glow)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                        {d.drugClass}
                      </div>
                      <SourceBadge source={d.source} />
                    </div>
                    <div className="mt-1 text-lg font-semibold group-hover:text-primary">
                      {d.name}
                    </div>
                    {d.brand && (
                      <div className="text-xs text-muted-foreground">{d.brand}</div>
                    )}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {d.route}
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {d.indication}
                </p>
                <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>t½ {d.halfLifeHours}h</span>
                  <span>{d.elimination}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-[11px] text-muted-foreground">
          Drug-View · Educational tool · Not for clinical decision-making
        </div>
      </footer>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
