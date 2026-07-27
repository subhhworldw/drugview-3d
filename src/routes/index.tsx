import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchAllDrugs, filterDrugs, uniqueDrugClasses } from "@/lib/drugs-data";
import { lookupDrug } from "@/lib/drug-lookup.functions";
import { SourceBadge } from "@/components/source-badge";
import { ThemeToggle } from "@/components/theme-toggle";
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

  // Most-used classes first, so the pill row stays short.
  const topClasses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of drugs) counts.set(d.drugClass, (counts.get(d.drugClass) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([c]) => c);
  }, [drugs]);

  const moreClasses = useMemo(
    () => drugClasses.filter((c) => !topClasses.includes(c)),
    [drugClasses, topClasses],
  );
  const [classMenuOpen, setClassMenuOpen] = useState(false);

  const textMatches = useMemo(() => filterDrugs(drugs, q), [drugs, q]);
  const results = useMemo(() => {
    const list = selectedClass
      ? textMatches.filter((d) => d.drugClass === selectedClass)
      : textMatches;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [textMatches, selectedClass]);

  // Progressive reveal, grouped under two-letter alphabetical headings (Aa, Ab…).
  const PAGE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  useEffect(() => setVisibleCount(PAGE), [q, selectedClass]);

  const visible = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);
  const groups = useMemo(() => {
    const out: { key: string; items: typeof visible }[] = [];
    for (const d of visible) {
      const raw = d.name.slice(0, 2);
      const key =
        raw.length < 2
          ? raw.toUpperCase()
          : raw[0].toUpperCase() + raw[1].toLowerCase();
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(d);
      else out.push({ key, items: [d] });
    }
    return out;
  }, [visible]);


  // Live lookup: only when the local catalog has nothing, debounced so typing
  // doesn't spam RxNorm/openFDA. Each term is attempted at most once.
  const queryClient = useQueryClient();
  const runLookup = useServerFn(lookupDrug);
  const navigate = useNavigate();

  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const attempted = useRef<Set<string>>(new Set());
  const resultsRef = useRef<HTMLElement | null>(null);

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // A class filter hiding otherwise-valid matches is a filter problem, not a
  // missing-drug problem — surface it instead of hitting the external APIs.
  const filteredOutByClass = Boolean(selectedClass) && results.length === 0 && textMatches.length > 0;

  const shouldLookup =
    !isLoading &&
    !error &&
    !filteredOutByClass &&
    q.trim().length >= 3 &&
    results.length === 0 &&
    textMatches.length === 0;


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
        if (res.status === "ok" && "slug" in res && res.slug) {
          await queryClient.invalidateQueries({ queryKey: ["drugs"] });
          if (!cancelled) requestAnimationFrame(scrollToResults);
        } else if (res.status === "ok") {
          // Live FDA result — rendered ephemerally, never stored.
          navigate({ to: "/live/$term", params: { term } });
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
  }, [shouldLookup, q, runLookup, queryClient, navigate]);

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
          <div className="flex items-center gap-3">
            <div className="hidden font-mono text-[11px] uppercase tracking-widest text-muted-foreground md:block">
              {drugs.length} drugs · {drugClasses.length} classes
            </div>
            <ThemeToggle />
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                scrollToResults();
              }}
              className="relative"
            >
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
                maxLength={80}
                onChange={(e) => setQ(e.target.value.slice(0, 80))}
                placeholder="Search by name, brand, class or indication…"
                className="w-full rounded-md border border-input bg-input/40 py-3 pl-10 pr-12 text-sm outline-none ring-primary/40 transition focus:border-primary focus:ring-2"
              />
              <button
                type="submit"
                aria-label="Jump to results"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-primary hover:text-primary-foreground"
              >
                <svg
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
              </button>
            </form>
          </div>

        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={!selectedClass} onClick={() => setSelectedClass(null)}>
              All classes
            </FilterChip>
            {topClasses.map((c) => (
              <FilterChip
                key={c}
                active={selectedClass === c}
                onClick={() => setSelectedClass(c === selectedClass ? null : c)}
              >
                {c}
              </FilterChip>
            ))}
            {selectedClass && !topClasses.includes(selectedClass) && (
              <FilterChip active onClick={() => setSelectedClass(null)}>
                {selectedClass}
              </FilterChip>
            )}
            {moreClasses.length > 0 && (
              <Popover open={classMenuOpen} onOpenChange={setClassMenuOpen}>
                <PopoverTrigger asChild>
                  <button className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                    More classes ▾
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-0">
                  <Command>
                    <CommandInput placeholder="Search classes…" className="text-xs" />
                    <CommandList>
                      <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                        No classes found.
                      </CommandEmpty>
                      <CommandGroup>
                        {moreClasses.map((c) => (
                          <CommandItem
                            key={c}
                            value={c}
                            onSelect={() => {
                              setSelectedClass(c === selectedClass ? null : c);
                              setClassMenuOpen(false);
                            }}
                            className="font-mono text-[10px] uppercase tracking-widest"
                          >
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section ref={resultsRef} className="mx-auto max-w-6xl px-6 py-8 scroll-mt-4">
        {!isLoading && !error && (
          <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Showing {results.length} of {drugs.length} drugs
            {selectedClass && <> · {selectedClass}</>}
          </div>
        )}
        {isLoading ? (
          <div className="py-24 text-center text-muted-foreground">Loading drug library…</div>
        ) : error ? (
          <div className="py-24 text-center text-destructive">
            Failed to load drug library.
          </div>
        ) : results.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            {filteredOutByClass ? (
              <>
                <p className="text-sm">
                  No drugs in &ldquo;{selectedClass}&rdquo; match &ldquo;{q}&rdquo;.
                </p>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="mt-3 rounded-full border border-primary px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"
                >
                  Clear class filter
                </button>
              </>
            ) : lookingUp ? (
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
          <p>Drug-View · Educational tool · Not for clinical decision-making</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Built by: Subham Samal (IMSC.Bi, BJB Autonomous College) 🧬
          </p>
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
