import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AgentGraph } from "@/components/doughdilly/AgentGraph";
import { Workflow } from "@/components/doughdilly/Workflow";
import { Spark } from "@/components/doughdilly/Spark";
import { ProgressUpdate } from "@/components/doughdilly/ProgressUpdate";
import { APPLICANTS, type Snapshot } from "@/lib/applicants";
import { DIMENSIONS, evidencedCount, grade, merit, sinceLabel, ABSTAIN_MIN } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import mascotUrl from "@/assets/dilly-mascot.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DoughDilly — Agentic Founder Evaluation Demo" },
      { name: "description", content: "Watch AI agents evaluate a startup founder over time with live KPIs, report card, and workflow." },
      { property: "og:title", content: "DoughDilly — Agentic Founder Evaluation Demo" },
      { property: "og:description", content: "Time-sequenced founder scoring with agent flow visualization." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DD = APPLICANTS[0]!;

function Index() {
  const [appId, setAppId] = useState(DD.id);
  const app = APPLICANTS.find((a) => a.id === appId) ?? DD;
  const [snaps, setSnaps] = useState<Snapshot[]>(DD.snapshots);
  const [sel, setSel] = useState(DD.snapshots.length - 1);
  const [step, setStep] = useState(-1);
  const [now, setNow] = useState<Date | null>(null);
  const script = app.script;
  const running = step >= 0 && step < script.length;
  const hvs = useRef<HTMLIFrameElement>(null);
  const [view, setView] = useState<"map" | "holo">("map");

  const pickApplicant = (id: string) => {
    const a = APPLICANTS.find((x) => x.id === id) ?? DD;
    setAppId(a.id);
    setSnaps(a.snapshots);
    setSel(a.snapshots.length - 1);
    setStep(-1);
  };
  useEffect(() => {
    if (!running) return;
    const e = script[step]!;
    const to = e.to ?? e.tool ?? "DILLY";
    hvs.current?.contentWindow?.postMessage({ hvs: { type: "msg", from: e.from, to, kind: e.kind, note: e.note, busy: 1 } }, "*");
  }, [step, running, script]);

  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      if (step === script.length - 1) {
        const live: Snapshot = { ...app.snapshots[app.snapshots.length - 1]!, id: "live", label: "Live re-eval", date: new Date().toISOString(), note: app.liveNote };
        setSnaps((s) => [...s.filter((x) => x.id !== "live"), live]);
        setSel(app.snapshots.length);
        setNow(new Date());
        setStep(script.length);
      } else setStep(step + 1);
    }, 1100);
    return () => clearTimeout(t);
  }, [step, running, script, app]);

  const snap = snaps[sel]!;
  const score = merit(snap.scores, snap.v);
  const ev = evidencedCount(snap.scores);
  const last = snaps[snaps.length - 1]!;
  const stage = running ? script[step]!.stage : snap.stageReached;
  const log = useMemo(() => script.slice(0, Math.max(0, step + 1)), [step, script]);
  const series = (idx: number) => snaps.map((s) => s.kpis[idx]?.num ?? null);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 max-w-7xl mx-auto space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={mascotUrl} alt="DoughDilly robot mascot: Show me the traction" width={816} height={816}
            className="h-64 w-64 rounded-3xl border-2 border-primary shadow-glow object-contain shrink-0" />
          <div>
            <div className="font-mono text-xs text-primary tracking-widest">DOUGHDILLY · DEMO MODE · SYNTHETIC DATA</div>
            <label className="mt-1 block">
              <span className="text-[10px] uppercase font-mono text-muted-foreground">Applicant</span>
              <select value={appId} onChange={(e) => pickApplicant(e.target.value)} disabled={running}
                className="mt-0.5 block rounded-md border border-border bg-background px-2 py-1.5 text-xl font-bold text-foreground disabled:opacity-60">
                {APPLICANTS.map((a) => <option key={a.id} value={a.id}>{a.name}{a.live ? " (live demo)" : ""}</option>)}
              </select>
            </label>
            <div className="text-muted-foreground text-sm font-normal">{app.stage}</div>
            <p className="text-sm text-muted-foreground">{app.tagline} · Referred by {app.referrer}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="panel px-3 py-2 text-right">
            <div className="text-[10px] uppercase text-muted-foreground font-mono">Last evaluated</div>
            <div className="font-mono text-lg text-accent">{now && last.date ? sinceLabel(last.date, now) : "—"}</div>
          </div>
          <button onClick={() => setStep(0)} disabled={running || !now}
            className="rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {!now ? "Loading…" : running ? "Agents running…" : "▶ Run live evaluation"}
          </button>
        </div>
      </header>

      <section className="panel p-4">
        <div className="flex justify-between mb-3"><h2 className="font-semibold">Where the applicant is</h2>
          <span className="font-mono text-xs text-muted-foreground">{running ? "live run" : snap.label}</span></div>
        <Workflow current={stage} running={running} />
      </section>

      <section className="panel p-4">
        <h2 className="font-semibold mb-2">Applicant process — <span className="text-primary">{app.name}</span></h2>
        <iframe src="/flow.html" title={`${app.name} applicant process flowchart`} className="h-[920px] w-full rounded border border-border bg-background" />
      </section>

      <section className="panel p-4">
        <h2 className="font-semibold mb-3">Evaluation timeline <span className="text-xs text-muted-foreground font-normal">— pick a point in time; KPIs and scores update</span></h2>
        <div className="flex gap-2 overflow-x-auto">
          {snaps.map((s, i) => {
            const m = merit(s.scores, s.v);
            return (
              <button key={s.id} onClick={() => setSel(i)}
                className={cn("panel min-w-36 px-3 py-2 text-left transition", i === sel ? "border-primary shadow-glow" : "opacity-70 hover:opacity-100")}>
                <div className="text-xs font-mono text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold">{m ?? "N/A"} <span className="text-sm text-accent">{grade(m)}</span></div>
                <div className="text-[10px] text-muted-foreground">{now ? sinceLabel(s.date, now) : ""}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-5 gap-5">
        <section className="panel p-4 lg:col-span-2 space-y-4">
          <div className="flex items-start justify-between">
            <div><h2 className="font-semibold">Report card</h2><p className="text-xs text-muted-foreground">{snap.label} · {now ? sinceLabel(snap.date, now) : ""}</p></div>
            <span className="font-mono text-[10px] rounded border border-primary px-1.5 py-0.5 text-primary">PRISM ✓</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-muted p-3">
              <div className="text-xs text-muted-foreground">Merit</div>
              {score == null
                ? <div className="text-lg font-bold text-accent">Not enough data</div>
                : <div className="text-4xl font-bold">{score}<span className="text-xl text-primary ml-2">{grade(score)}</span></div>}
            </div>
            <div className="rounded-md bg-muted p-3">
              <div className="text-xs text-muted-foreground">Fund fit</div>
              <div className="text-4xl font-bold">{snap.fundFit}</div>
            </div>
          </div>
          <div className="text-xs font-mono text-muted-foreground">Evidence: {ev}/10 dims (gate ≥ {ABSTAIN_MIN}) · verification adj {snap.v}</div>
          <ul className="space-y-1.5">
            {DIMENSIONS.map((d) => {
              const v = snap.scores[d.key];
              return (
                <li key={d.key} className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
                  <div>
                    <div className="flex justify-between"><span>{d.label}</span><span className="text-[10px] text-muted-foreground font-mono">{d.weight}%</span></div>
                    <div className="h-1.5 rounded-full bg-muted mt-1">
                      {v != null && <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${(v / 5) * 100}%` }} />}
                    </div>
                  </div>
                  <span className={cn("font-mono w-14 text-right text-xs", v == null && "text-accent")}>{v == null ? "unknown" : `${v}/5`}</span>
                </li>
              );
            })}
          </ul>
          {snap.flags.length > 0 && (
            <div className="rounded-md border border-destructive p-2 text-xs">
              <div className="font-semibold text-destructive mb-1">Red flags</div>
              {snap.flags.map((f) => <div key={f}>• {f}</div>)}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{snap.note}</p>
          <div className="text-xs text-muted-foreground">Founders: {app.founders.join(" · ")}</div>
        </section>

        <div className="lg:col-span-3 space-y-5">
          <section className="panel p-4">
            <h2 className="font-semibold mb-3">KPIs over time</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {snap.kpis.map((kpi, i) => (
                <div key={kpi.label} className="rounded-md bg-muted p-3">
                  <div className="text-[11px] text-muted-foreground">{kpi.label}</div>
                  <div className="text-xl font-bold font-mono">{kpi.val}</div>
                  <Spark values={series(i)} active={sel} />
                </div>
              ))}
            </div>
          </section>
          <ProgressUpdate startup={`${app.name} (${app.stage}) — ${app.tagline}`}
            kpis={snap.kpis.map((kpi) => `${kpi.label}: ${kpi.val}`).join(", ")} />
          <section className="panel p-4">
            <div className="flex justify-between mb-2"><h2 className="font-semibold">Agent flow & tool use</h2>
              <span className="font-mono text-xs text-muted-foreground">{running ? `step ${step + 1}/${script.length}` : step >= script.length ? "complete" : "idle — press Run"}</span></div>
            <div role="tablist" className="mb-2 flex gap-1">
              {(["map", "holo"] as const).map((t) => (
                <button key={t} role="tab" aria-selected={view === t} onClick={() => setView(t)}
                  className={cn("rounded px-3 py-1 text-xs font-mono border", view === t ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                  {t === "map" ? "Visualization" : "Holographic 3D"}
                </button>
              ))}
            </div>
            <div className={cn(view !== "map" && "hidden")}><AgentGraph step={running ? step : -1} /></div>
            <iframe ref={hvs} src="/hvs.html" title="3D agent swarm" className={cn("h-[600px] w-full rounded border border-border bg-background", view !== "holo" && "hidden")} />
            <div className="mt-2 h-36 overflow-y-auto rounded bg-background p-2 font-mono text-[11px] space-y-0.5 flex flex-col-reverse">
              <div>
                {log.length === 0 && <div className="text-muted-foreground">Event stream will appear here…</div>}
                {log.map((e, i) => (
                  <div key={i} className={cn(e.kind === "err" ? "text-destructive" : e.kind === "ok" ? "text-primary" : e.kind === "tool" ? "text-accent" : "text-foreground")}>
                    [{e.stage}] {e.from}{e.to ? ` → ${e.to}` : " ⚙"} · {e.note}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
      <footer className="text-center text-[11px] text-muted-foreground">DoughDilly informs partners; decisions are always made by a human.</footer>
    </main>
  );
}
