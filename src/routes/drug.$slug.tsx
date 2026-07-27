import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchDrugBySlug } from "@/lib/drugs-data";
import { BodySceneClient } from "@/components/body-scene";
import { DrugInfoPanel } from "@/components/drug-info-panel";
import { PhaseTimeline } from "@/components/phase-timeline";
import { ThemeToggle } from "@/components/theme-toggle";

const drugQueryOptions = (slug: string) => ({
  queryKey: ["drug", slug],
  queryFn: async () => {
    const drug = await fetchDrugBySlug(slug);
    if (!drug) throw notFound();
    return drug;
  },
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/drug/$slug")({
  loader: async ({ params, context }) => {
    const drug = await context.queryClient.ensureQueryData(
      drugQueryOptions(params.slug),
    );
    return { drug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Drug not found — Drug-View" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const d = loaderData.drug;
    const title = `${d.name} in 3D — ${d.drugClass} · Drug-View`;
    const desc = `See how ${d.name} moves through the body: ${d.mechanism.slice(0, 140)}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DrugPage,
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Couldn&rsquo;t load drug</h1>
        <p className="mt-2 text-muted-foreground">Please try again in a moment.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to library
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Drug not found</h1>
        <p className="mt-2 text-muted-foreground">
          That drug isn&rsquo;t in the current library.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to library
        </Link>
      </div>
    </div>
  ),
});

function DrugPage() {
  const { slug } = Route.useParams();
  const { data: drug } = useSuspenseQuery(drugQueryOptions(slug));
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
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

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* 3D viewer */}
        <div className="relative flex min-h-[60vh] flex-1 flex-col lg:min-h-0">
          <div
            className="flex-1"
            style={{ background: "var(--gradient-body)" }}
          >
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

        {/* Info panel */}
        <aside className="w-full border-t border-border bg-card/40 lg:w-[380px] lg:border-l lg:border-t-0">
          <DrugInfoPanel drug={drug} />
        </aside>
      </div>
    </div>
  );
}
