import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { lookupDrug } from "@/lib/drug-lookup.functions";
import { rowToDrug, type DrugRowLike } from "@/lib/drugs-data";
import { DrugViewer } from "@/components/drug-viewer";

// Ephemeral live view: RxNorm/openFDA data rendered on the fly.
// Nothing here is written to the database.
export const Route = createFileRoute("/live/$term")({
  loader: async ({ params }) => {
    const term = params.term.slice(0, 80);
    const res = await lookupDrug({ data: { term } });
    if (res.status === "ok" && "drug" in res && res.drug) {
      return { drug: rowToDrug(res.drug as DrugRowLike), message: null as string | null };
    }
    if (res.status === "ok" && "slug" in res && res.slug) {
      // Already in the catalog — send the user to the real detail page.
      throw redirect({ to: "/drug/$slug", params: { slug: res.slug } });
    }
    return { drug: null, message: res.message ?? "No data available for this drug." };
  },

  head: ({ loaderData, params }) => {
    const name = loaderData?.drug?.name ?? params.term;
    const title = `${name} in 3D — live FDA lookup · Drug-View`;
    const desc = `Live RxNorm and FDA label data for ${name}, animated through absorption, distribution, metabolism and elimination.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: LivePage,
  errorComponent: () => <Fallback message="Live lookup is unavailable right now." />,
  notFoundComponent: () => <Fallback message="That drug could not be found." />,
});

function Fallback({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">No live data</h1>
        <p className="mt-2 text-muted-foreground">{message}</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to library
        </Link>
      </div>
    </div>
  );
}

function LivePage() {
  const data = Route.useLoaderData();
  if (!data.drug) {
    return <Fallback message={data.message ?? "No structured data available."} />;
  }
  return (
    <DrugViewer
      drug={data.drug}
      notice="Live preview from RxNorm / openFDA — not saved to the Drug-View catalog."
    />
  );
}
