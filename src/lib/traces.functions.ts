import { createServerFn } from "@tanstack/react-start";

const HOST = () => process.env["PRISMTRACE_HOST"] ?? "https://api.prism.blockconvey.com";
const PROJECT = () => process.env["PRISMTRACE_PROJECT_ID"] ?? "5784abce-d870-4783-84f9-1cafc99bc5c9";

export type TraceDto = {
  id: string;
  model: string;
  latencyMs: number;
  createdAt: string;
  sessionId: string | null;
  agentId: string | null;
  prompt: string;
  result: string;
  quality: number | null;
  intent: string | null;
};

type ListRow = { id: string; model: string; latency_ms: number; created_at: string; session_id: string | null; agent_id: string | null };

async function prismGet(path: string, key: string) {
  const res = await fetch(`${HOST()}${path}`, { headers: { "X-PRISMtrace-Key": key } });
  if (!res.ok) throw new Error(`PRISM read failed: ${res.status}`);
  return res.json();
}

export const listPrismTraces = createServerFn({ method: "GET" }).handler(async (): Promise<{ traces: TraceDto[]; error?: string }> => {
  const key = process.env["PRISMTRACE_API_KEY"];
  if (!key) return { traces: [], error: "PRISM key not configured" };
  try {
    const list = await prismGet(`/api/traces?project_id=${PROJECT()}&page_size=50`, key);
    const rows: ListRow[] = list.traces ?? [];
    const details = await Promise.all(
      rows.map(async (r): Promise<TraceDto> => {
        try {
          const d = await prismGet(`/api/traces/${r.id}`, key);
          const prompt = (d.input_messages ?? []).map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n\n");
          return {
            id: r.id,
            model: d.model ?? r.model,
            latencyMs: d.latency_ms ?? r.latency_ms,
            createdAt: d.created_at ?? r.created_at,
            sessionId: d.session_id ?? r.session_id,
            agentId: d.agent_id ?? r.agent_id,
            prompt,
            result: typeof d.output_message === "string" ? d.output_message : JSON.stringify(d.output_message ?? ""),
            quality: d.evaluation?.response_quality ?? null,
            intent: d.evaluation?.intent_detected ?? null,
          };
        } catch {
          return { id: r.id, model: r.model, latencyMs: r.latency_ms, createdAt: r.created_at, sessionId: r.session_id, agentId: r.agent_id, prompt: "", result: "", quality: null, intent: null };
        }
      }),
    );
    return { traces: details };
  } catch (e) {
    console.error("listPrismTraces failed", e);
    return { traces: [], error: "Could not reach PRISM. Try again in a moment." };
  }
});
