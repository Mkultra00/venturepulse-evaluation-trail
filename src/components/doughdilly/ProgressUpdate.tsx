import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { assessProgress } from "@/lib/progress.functions";
import type { Assessment } from "@/lib/progress.server";
import { cn } from "@/lib/utils";

const SAMPLE = `October update: We closed 3 new mid-market logos (Harbor Freight Finance, Nolan Logistics, Vera Health) and ARR is now ~$1.9M. One design partner churned after their CFO left. We hired 2 engineers (team now 11). Gross margin dipped to 64% because of higher LLM inference costs during the month-end close spike; we're moving to a cheaper model next sprint. Week-8 retention on the new cohort is 79%.`;

const arrow = { up: "▲", down: "▼", flat: "■", unclear: "?" } as const;

export function ProgressUpdate({ startup, kpis }: { startup: string; kpis: string }) {
  const run = useServerFn(assessProgress);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Assessment | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await run({ data: { startup, kpis, update: text } });
      if (r.ok) setRes(r.assessment); else setErr(r.error);
    } catch { setErr("AI assessment failed. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <section className="panel p-4 space-y-3">
      <div className="flex justify-between items-baseline">
        <h2 className="font-semibold">Founder progress update</h2>
        <span className="font-mono text-xs text-muted-foreground">AI-powered assessment</span>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
        placeholder="Paste the founder's update (email, investor letter, call notes)…"
        className="w-full rounded border border-border bg-background p-2 text-sm" />
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy || text.trim().length < 20}
          className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Assessing…" : "Assess update"}
        </button>
        <button onClick={() => setText(SAMPLE)} className="rounded-md border border-border px-3 py-2 text-sm">Use sample update</button>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {res && (
        <div className="space-y-3 text-sm">
          <p>{res.summary} <span className="font-mono text-xs text-muted-foreground">· confidence {res.confidence}</span></p>
          <ul className="space-y-1">
            {res.kpiImpacts.map((k, i) => (
              <li key={i} className="grid grid-cols-[1.5rem_8rem_1fr] gap-2">
                <span className={cn("font-mono", k.direction === "up" ? "text-primary" : k.direction === "down" ? "text-destructive" : "text-muted-foreground")}>{arrow[k.direction]}</span>
                <span className="font-semibold">{k.kpi}</span>
                <span className="text-muted-foreground">{k.rationale}</span>
              </li>
            ))}
          </ul>
          {res.redFlags.length > 0 && (
            <div className="rounded border border-destructive/40 p-2 text-destructive">
              {res.redFlags.map((f, i) => <div key={i}>• {f}</div>)}
            </div>
          )}
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-1">Follow-up questions</div>
            {res.followUps.map((f, i) => <div key={i}>→ {f}</div>)}
          </div>
          <div className="rounded bg-background p-3 border border-border">
            <div className="text-xs font-mono text-accent mb-1">Evaluation note</div>
            <p>{res.note}</p>
          </div>
        </div>
      )}
    </section>
  );
}
