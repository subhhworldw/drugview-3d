import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { fetchAllDrugs, NOT_AVAILABLE, type Drug } from "@/lib/drugs-data";
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

const compareSearchSchema = z.object({
  a: fallback(z.string(), "").default(""),
  b: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/compare")({
  validateSearch: zodValidator(compareSearchSchema),
  head: () => ({
    meta: [
      { title: "Compare drugs — Drug-View" },
      {
        name: "description",
        content:
          "Compare two drugs side by side: half-life, elimination route, metabolizing enzymes and metabolism organ, from structured FDA label data.",
      },
      { property: "og:title", content: "Compare drugs — Drug-View" },
      {
        property: "og:description",
        content: "Side-by-side pharmacokinetic comparison of any two drugs in the catalog.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { a, b } = Route.useSearch();
  const navigate = useNavigate({ from: "/compare" });

  const { data: drugs = [], isLoading, error } = useQuery({
    queryKey: ["drugs"],
    queryFn: fetchAllDrugs,
    staleTime: 5 * 60 * 1000,
  });

  const drugA = useMemo(() => drugs.find((d) => d.slug === a) ?? null, [drugs, a]);
  const drugB = useMemo(() => drugs.find((d) => d.slug === b) ?? null, [drugs, b]);

  const setSlot = (slot: "a" | "b", slug: string) =>
    navigate({ search: (prev) => ({ ...prev, [slot]: slug }), replace: true });

  const swap = () => navigate({ search: { a: b, b: a }, replace: true });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M2 12h20" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div>
              <h1 className="font-mono text-sm uppercase tracking-widest">Drug-View</h1>
              <p className="text-[11px] text-muted-foreground">Compare pharmacokinetics</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              ← Library
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Compare two drugs.
        </h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Pick any two medications from the catalog to see half-life, elimination,
          metabolizing enzymes and metabolism organ side by side.
        </p>

        {error && (
          <p className="mt-6 text-sm text-destructive">Failed to load the drug catalog.</p>
        )}

        {/* Pickers */}
        <div className="mt-8 grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
          <DrugPicker
            label="Drug A"
            drugs={drugs}
            selected={drugA}
            excludeSlug={b}
            disabled={isLoading}
            onSelect={(slug) => setSlot("a", slug)}
          />
          <button
            type="button"
            onClick={swap}
            disabled={!a && !b}
            aria-label="Swap drugs"
            className="mx-auto flex h-10 w-10 items-center justify-center self-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
          >
            ⇄
          </button>
          <DrugPicker
            label="Drug B"
            drugs={drugs}
            selected={drugB}
            excludeSlug={a}
            disabled={isLoading}
            onSelect={(slug) => setSlot("b", slug)}
          />
        </div>

        {/* Comparison */}
        {drugA && drugB ? (
          <ComparisonTable a={drugA} b={drugB} />
        ) : (
          <p className="mt-10 rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
            {isLoading
              ? "Loading catalog…"
              : "Select both drugs above to see the comparison."}
          </p>
        )}
      </main>
    </div>
  );
}

function DrugPicker({
  label,
  drugs,
  selected,
  excludeSlug,
  disabled,
  onSelect,
}: {
  label: string;
  drugs: Drug[];
  selected: Drug | null;
  excludeSlug: string;
  disabled?: boolean;
  onSelect: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    const pool = drugs.filter((d) => d.slug !== excludeSlug);
    if (!query) return pool.slice(0, 12);
    return pool
      .filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.brand?.toLowerCase().includes(query) ||
          d.drugClass.toLowerCase().includes(query),
      )
      .slice(0, 12);
  }, [drugs, q, excludeSlug]);

  return (
    <div>
      <div className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/60 disabled:opacity-50"
          >
            {selected ? (
              <span className="min-w-0">
                <span className="block truncate font-medium">{selected.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {selected.drugClass}
                  {selected.brand ? ` · ${selected.brand}` : ""}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Search a drug…</span>
            )}
            <span className="text-muted-foreground">▾</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Type a drug name…" value={q} onValueChange={setQ} />
            <CommandList>
              <CommandEmpty>No matching drug in the catalog.</CommandEmpty>
              <CommandGroup>
                {matches.map((d) => (
                  <CommandItem
                    key={d.slug}
                    value={d.slug}
                    onSelect={() => {
                      onSelect(d.slug);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{d.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.drugClass}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ---------- comparison rendering ----------

function ComparisonTable({ a, b }: { a: Drug; b: Drug }) {
  const maxHalfLife = Math.max(a.halfLifeHours ?? 0, b.halfLifeHours ?? 0);

  return (
    <div className="mt-10 overflow-hidden rounded-lg border border-border">
      {/* header row */}
      <div className="grid grid-cols-[1fr_1fr] border-b border-border bg-muted/40 md:grid-cols-[180px_1fr_1fr]">
        <div className="hidden px-4 py-4 md:block" />
        <CompareCard drug={a} />
        <CompareCard drug={b} />
      </div>

      <CompareRow
        label="Half-life (t½)"
        valueA={a.halfLifeHours === null ? null : `${a.halfLifeHours} h`}
        valueB={b.halfLifeHours === null ? null : `${b.halfLifeHours} h`}
        differ={a.halfLifeHours !== b.halfLifeHours}
        barA={a.halfLifeHours}
        barB={b.halfLifeHours}
        barMax={maxHalfLife}
      />
      <CompareRow
        label="Elimination"
        valueA={a.elimination ? cap(a.elimination) : null}
        valueB={b.elimination ? cap(b.elimination) : null}
        differ={a.elimination !== b.elimination}
      />
      <CompareRow
        label="Metabolism organ"
        valueA={a.metabolism.organ ? prettyOrgan(a.metabolism.organ) : null}
        valueB={b.metabolism.organ ? prettyOrgan(b.metabolism.organ) : null}
        differ={a.metabolism.organ !== b.metabolism.organ}
      />
      <CompareRow
        label="Enzymes"
        valueA={a.metabolism.enzymes.length ? a.metabolism.enzymes.join(", ") : null}
        valueB={b.metabolism.enzymes.length ? b.metabolism.enzymes.join(", ") : null}
        differ={a.metabolism.enzymes.join("|") !== b.metabolism.enzymes.join("|")}
        mono
      />
      <CompareRow label="Drug class" valueA={a.drugClass} valueB={b.drugClass} differ={a.drugClass !== b.drugClass} />
      <CompareRow label="Route" valueA={a.route.toUpperCase()} valueB={b.route.toUpperCase()} differ={a.route !== b.route} mono />

      <div className="border-t border-border bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground">
        Rows highlighted on the left differ between the two drugs. “{NOT_AVAILABLE}”
        means the FDA label text doesn't state the value — not that it's zero.
      </div>
    </div>
  );
}

function CompareCard({ drug }: { drug: Drug }) {
  return (
    <div className="border-l border-border px-4 py-4">
      <div className="flex items-center gap-2">
        <SourceBadge source={drug.source} />
      </div>
      <Link
        to="/drug/$slug"
        params={{ slug: drug.slug }}
        className="mt-1 block truncate text-lg font-semibold tracking-tight hover:text-primary"
      >
        {drug.name}
      </Link>
      <div className="mt-0.5 truncate text-xs text-muted-foreground">{drug.indication}</div>
    </div>
  );
}

function CompareRow({
  label,
  valueA,
  valueB,
  differ,
  mono,
  barA,
  barB,
  barMax,
}: {
  label: string;
  valueA: string | null;
  valueB: string | null;
  differ: boolean;
  mono?: boolean;
  barA?: number | null;
  barB?: number | null;
  barMax?: number;
}) {
  return (
    <div className="grid grid-cols-1 border-b border-border last:border-b-0 md:grid-cols-[180px_1fr_1fr]">
      <div
        className={`px-4 py-3 font-mono text-[11px] uppercase tracking-widest md:border-r md:border-border ${
          differ ? "bg-accent/10 text-accent" : "text-muted-foreground"
        }`}
      >
        {label}
        {differ && <span className="ml-1.5 text-[9px]">●</span>}
      </div>
      <Cell value={valueA} mono={mono} bar={barA} barMax={barMax} />
      <Cell value={valueB} mono={mono} bar={barB} barMax={barMax} />
    </div>
  );
}

function Cell({
  value,
  mono,
  bar,
  barMax,
}: {
  value: string | null;
  mono?: boolean;
  bar?: number | null;
  barMax?: number;
}) {
  return (
    <div className={`border-t border-border px-4 py-3 text-sm md:border-l md:border-t-0 ${mono ? "font-mono" : ""}`}>
      {value ? (
        <>
          <span>{value}</span>
          {bar !== null && bar !== undefined && barMax !== undefined && barMax > 0 && (
            <div className="mt-1.5 h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(3, (bar / barMax) * 100)}%` }}
              />
            </div>
          )}
        </>
      ) : (
        <span className="italic text-muted-foreground/80">{NOT_AVAILABLE}</span>
      )}
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prettyOrgan(o: string) {
  return o
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
