// Roundtable live activity log (plain HTTP tool API — the MCP connector is
// builder-side only, so the app calls POST /api/tools/record directly with its
// own agent key). Server-only: ROUNDTABLE_AGENT_KEY must never ship to the browser.

const ROUNDTABLE_HOST = () => process.env["ROUNDTABLE_HOST"] ?? "https://roundtable.bot";

export async function emitAssessmentRecord(opts: {
  startup: string;
  sessionId: string;
  model: string;
  latencyMs: number;
  assessment: { summary: string; confidence: string; kpiImpacts: { kpi: string; direction: string }[]; redFlags: string[] };
}) {
  const key = process.env["ROUNDTABLE_AGENT_KEY"];
  if (!key) return; // logging is best-effort; never break the app over it
  const a = opts.assessment;
  const impacts = a.kpiImpacts.map((k) => `${k.kpi} ${k.direction}`).join(", ");
  try {
    const res = await fetch(`${ROUNDTABLE_HOST()}/api/tools/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        request_id: `assess-${opts.sessionId}-${Date.now()}`,
        kind: "task",
        status: "done",
        title: `Assessment run — ${opts.startup} (${new Date().toISOString().slice(0, 16)}Z)`,
        summary:
          `Founder progress update assessed for ${opts.startup}. ` +
          `Confidence: ${a.confidence}. KPI impacts: ${impacts || "none"}. ` +
          `Red flags: ${a.redFlags.length ? a.redFlags.join("; ") : "none"}. ` +
          `Summary: ${a.summary} ` +
          `Model: ${opts.model} via Ollama. Latency: ${opts.latencyMs} ms. PRISM session: ${opts.sessionId}.`,
      }),
    });
    if (!res.ok) console.error("Roundtable record failed", res.status, await res.text());
  } catch (e) {
    console.error("Roundtable record error", e);
  }
}
