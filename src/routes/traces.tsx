import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listPrismTraces, type TraceDto } from "@/lib/traces.functions";
import { APPLICANTS } from "@/lib/applicants";
import { cn } from "@/lib/utils";

const tracesQuery = queryOptions({
  queryKey: ["prism-traces"],
  queryFn: () => listPrismTraces(),
});

export const Route = createFileRoute("/traces")({
  loader: ({ context }) => context.queryClient.ensureQueryData(tracesQuery),
  head: () => ({
    meta: [
      { title: "PRISM traces — DoughDilly" },
      { name: "description", content: "Every AI assessment trace DoughDilly sent to PRISM: model, prompt, result and latency, grouped by startup." },
      { property: "og:title", content: "PRISM traces — DoughDilly" },
      { property: "og:description", content: "Every AI assessment trace DoughDilly sent to PRISM: model, prompt, result and latency, grouped by startup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TracesPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>
  ),
});

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function startupFor(sessionId: string | null): string {
  if (!sessionId) return "Un grouped";
  const s = sessionId.replace(/^assess-/, "");
  const match = APPLICANTS.find((a) => slug(a.name) === s || s.startsWith(slug(a.name)));
  return match ? match.name : s;
}

function prettyResult(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function TraceCard({ t }: { t: TraceDto }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel p-3">
      <button onClick={() => setOpen(!open)} className="w-full text-left flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</span>
        <span className="font-mono text-xs text-primary">{t.model}</span>
        <span className="font-mono text-xs text-accent">{(t.latencyMs / 1000).toFixed(1)}s</span>
        {t.quality != null && <span className="font-mono text-xs text-muted-foreground">quality {t.quality}/100</span>}
        {t.intent && <span className="font-mono text-xs text-muted-foreground">· {t.intent}</span>}
        <span className="ml-auto text-xs text-muted-foreground">{open ? "▾ hide" : "▸ details"}</span>
      </button>
      {open && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-1">Prompt</div>
            <pre className="max-h-80 overflow-auto rounded border border-border bg-background p-2 text-xs whitespace-pre-wrap">{t.prompt || "(not stored)"}</pre>
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-1">Result</div>
            <pre className="max-h-80 overflow-auto rounded border border-border bg-background p-2 text-xs whitespace-pre-wrap">{prettyResult(t.result) || "(not stored)"}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function TracesPage() {
  const { data } = useSuspenseQuery(tracesQuery);
  const groups = new Map<string, TraceDto[]>();
  for (const t of data.traces) {
    const k = startupFor(t.sessionId);
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 max-w-7xl mx-auto space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-primary tracking-widest">DOUGHDILLY · PRISM LIVE TRACING</div>
          <h1 className="text-2xl font-bold">PRISM trace details</h1>
          <p className="text-sm text-muted-foreground">Every assessment run, straight from PRISM — model, prompt, result and latency, grouped by startup.</p>
        </div>
        <Link to="/" className="rounded-md border border-border px-3 py-2 text-sm hover:text-primary">← Back to dashboard</Link>
      </header>

      {data.error && <p className="text-sm text-destructive">{data.error}</p>}
      {!data.error && data.traces.length === 0 && (
        <p className="text-sm text-muted-foreground">No traces yet — run an assessment from the dashboard and it will appear here.</p>
      )}

      {[...groups.entries()].map(([startup, traces]) => (
        <section key={startup} className="space-y-2">
          <h2 className={cn("font-semibold")}>{startup} <span className="font-mono text-xs text-muted-foreground">· {traces.length} trace{traces.length === 1 ? "" : "s"}</span></h2>
          {traces.map((t) => <TraceCard key={t.id} t={t} />)}
        </section>
      ))}
    </main>
  );
}
