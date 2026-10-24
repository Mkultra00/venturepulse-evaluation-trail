// PRISM live tracing (HTTP ingest — there is no npm SDK).
// Server-only: PRISMTRACE_API_KEY must never ship to the browser.

const PRISMTRACE_HOST = () => process.env["PRISMTRACE_HOST"] ?? "https://api.prism.blockconvey.com";
const PRISMTRACE_PROJECT_ID = () =>
  process.env["PRISMTRACE_PROJECT_ID"] ?? "5784abce-d870-4783-84f9-1cafc99bc5c9";

export async function emitTrace(input: string, output: string, opts?: {
  model?: string;
  latencyMs?: number;
  sessionId?: string;
  agentId?: string;
}) {
  const key = process.env["PRISMTRACE_API_KEY"];
  if (!key) return; // tracing is best-effort; never break the app over it
  try {
    const res = await fetch(`${PRISMTRACE_HOST()}/api/traces`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PRISMtrace-Key": key },
      body: JSON.stringify({
        project_id: PRISMTRACE_PROJECT_ID(),
        model: opts?.model ?? "unknown",
        input_messages: [{ role: "user", content: input }],
        output_message: output,
        latency_ms: opts?.latencyMs ?? 0,
        session_id: opts?.sessionId, // one value per conversation/run groups traces into a trajectory
        agent_id: opts?.agentId,
      }),
    });
    if (!res.ok) console.error("PRISM ingest failed", res.status, await res.text());
  } catch (e) {
    console.error("PRISM ingest error", e);
  }
}
