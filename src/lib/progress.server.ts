import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

const RUN_ID = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
    return res;
  };
}

export const assessmentSchema = z.object({
  summary: z.string(),
  kpiImpacts: z.array(
    z.object({
      kpi: z.string(),
      direction: z.enum(["up", "down", "flat", "unclear"]),
      rationale: z.string(),
    }),
  ),
  redFlags: z.array(z.string()),
  followUps: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
  note: z.string(),
});
export type Assessment = z.infer<typeof assessmentSchema>;

const INSTRUCTIONS = `You are an analyst helping venture investors evaluate a seed startup over time.
Given the latest known KPIs and a founder's progress update, assess how the update likely affects each KPI (ARR, NRR, burn multiple, gross margin, week-8 retention, FTE) and any others it mentions.
Rules: never invent numbers not in the update; mark direction "unclear" when evidence is thin; flag claims that conflict with the prior KPIs or are unverifiable; give 2-4 concrete follow-up questions.
"note" is a 3-5 sentence evaluation note for the partner file. You inform; a human partner decides.`;

export const NINOO_MODEL = "anthropic/claude-sonnet-5-5";

/** Accepts a bare base URL or a pasted curl snippet; returns the OpenAI-compatible base (…/v1). */
export function ninooBase(raw: string) {
  const url = raw.match(/https?:\/\/[^\s"']+/)?.[0] ?? raw.trim();
  return url.replace(/\/(chat\/completions|models)\/?$/, "").replace(/\/$/, "");
}

const JSON_CONTRACT = `Respond with ONLY a JSON object (no markdown, no prose, no code fences) with exactly these fields:
{"summary": string, "kpiImpacts": [{"kpi": string, "direction": "up"|"down"|"flat"|"unclear", "rationale": string}], "redFlags": string[], "followUps": string[], "confidence": "low"|"medium"|"high", "note": string}`;

function parseAssessment(raw: string): Assessment {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model output");
  return assessmentSchema.parse(JSON.parse(cleaned.slice(start, end + 1)));
}

export async function assessUpdate(apiKey: string, baseRaw: string, startup: string, kpis: string, update: string) {
  const provider = createOpenAI({ baseURL: ninooBase(baseRaw), apiKey, fetch: runIdFetch() });
  const prompt = `Startup: ${startup}\nLatest KPIs: ${kpis}\n\nFounder progress update:\n${update}`;
  const sessionId = `assess-${startup.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`; // stable per startup so runs group into one PRISM trajectory
  const started = performance.now();
  const result = streamText({
    model: provider.chat(NINOO_MODEL),
    system: `${INSTRUCTIONS}\n\n${JSON_CONTRACT}`,
    messages: [{ role: "user", content: prompt }],
    maxRetries: 0,
  });
  try {
    const text = await result.text;
    const assessment = parseAssessment(text);
    const { emitTrace } = await import("./prism.server");
    await emitTrace(prompt, JSON.stringify(assessment), {
      model: NINOO_MODEL,
      latencyMs: Math.round(performance.now() - started),
      sessionId,
      agentId: "progress-assessor",
    });
    return { ok: true as const, assessment };
  } catch (e) {
    if (e instanceof z.ZodError || (e instanceof Error && e.message.includes("JSON"))) {
      console.error("assessUpdate: unparseable model output:", String(e).slice(0, 2000));
      return { ok: false as const, error: "The AI response could not be read. Please try again." };
    }
    const status = (e as { statusCode?: number }).statusCode;
    console.error("assessUpdate failed", status, e);
    if (status === 402) return { ok: false as const, error: "AI credits are used up. Add credits in Settings → Plans & credits." };
    if (status === 429) return { ok: false as const, error: "Too many requests right now — wait a moment and try again." };
    if (status === 403) return { ok: false as const, error: "AI access is blocked for this workspace." };
    return { ok: false as const, error: "AI assessment failed. Please try again." };
  }
}
